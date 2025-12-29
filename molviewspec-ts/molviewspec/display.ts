/**
 * Display utilities for Jupyter notebooks and HTML generation.
 * Provides molstar_notebook() functionality similar to Python implementation.
 */

import type { MVSData } from "./nodes.ts";
import { MVSJ } from "./mvsj.ts";
import { MVSX } from "./mvsx.ts";

export type SupportedStates =
  | string
  | Record<string, unknown>
  | MVSData
  | Uint8Array
  | MVSX
  | MVSJ;

/**
 * Generate HTML string to display a Mol* viewer with the given state.
 */
export async function molstarHtml(
  state: SupportedStates,
  options: {
    data?: Record<string, Uint8Array>;
    ui?: "viewer" | "stories";
    molstarVersion?: string;
  } = {},
): Promise<string> {
  const { data, ui = "viewer", molstarVersion = "latest" } = options;

  let format = "mvsj";
  let stateData: string;

  // Convert state to appropriate format
  if (typeof state === "string") {
    stateData = state;
  } else if (state instanceof MVSJ) {
    stateData = state.dumps(0);
  } else if (state instanceof MVSX) {
    if (data) {
      console.warn("Warning: data is ignored when state is MVSX");
    }
    // MVSX needs to be serialized to ZIP and base64 encoded
    const bytes = await state.dumps();
    // Use chunked encoding to avoid stack overflow on large files
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    stateData = "base64," + btoa(binary);
    format = "mvsx";
  } else if (state instanceof Uint8Array) {
    if (data) {
      console.warn("Warning: data is ignored when state is MVSX bytes");
    }
    // Use chunked encoding to avoid stack overflow on large files
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < state.length; i += chunkSize) {
      binary += String.fromCharCode(...state.slice(i, i + chunkSize));
    }
    stateData = "base64," + btoa(binary);
    format = "mvsx";
  } else if ("root" in state || "snapshots" in state) {
    // It's MVSData (State or States)
    stateData = JSON.stringify(state);
  } else {
    // Generic object
    stateData = JSON.stringify(state);
  }

  // If additional data files provided, create MVSX
  if (data && Object.keys(data).length > 0) {
    // Would need to create a proper MVSX archive here
    console.warn(
      "Note: data parameter not yet fully implemented for HTML generation",
    );
    format = "mvsx";
  }

  const template = ui === "stories" ? STORIES_TEMPLATE : VIEWER_TEMPLATE;
  return template
    .replace(/\{\{version\}\}/g, molstarVersion)
    .replace("{{format}}", format)
    .replace("{{state}}", JSON.stringify(stateData));
}

/**
 * Helper to create a Jupyter display object with HTML MIME type.
 * This is what Deno Jupyter recognizes for rendering HTML.
 */
export function displayHTML(html: string): {
  [Symbol.for("Jupyter.display")](): { "text/html": string };
} {
  return {
    [Symbol.for("Jupyter.display")]() {
      return {
        "text/html": html,
      };
    },
  };
}

/**
 * Display Mol* viewer in a Deno Jupyter notebook.
 *
 * This function returns a display object that Deno Jupyter will render as an interactive
 * Mol* viewer directly in the notebook - similar to Python's molstar_notebook() function.
 *
 * @param state - MolViewSpec state to display
 * @param options - Display options (width, height, etc.)
 * @returns Display object for Jupyter notebook
 *
 * @example
 * ```typescript
 * import { createBuilder, molstarNotebook } from "./mod.ts";
 *
 * const builder = createBuilder();
 * builder.download("https://files.wwpdb.org/download/1cbs.cif")
 *   .parse("mmcif")
 *   .modelStructure()
 *   .component("all")
 *   .representation("cartoon");
 *
 * const state = builder.getState({ title: "My Structure" });
 *
 * // Display in notebook - just return this value in a cell
 * molstarNotebook(state);
 * ```
 *
 * @example
 * ```typescript
 * // With custom options
 * molstarNotebook(state, {
 *   width: 800,
 *   height: 600,
 *   downloadFilename: "my_structure",
 *   ui: "viewer",  // or "stories"
 *   molstarVersion: "latest"
 * });
 * ```
 */
export async function molstarNotebook(
  state: SupportedStates,
  options: {
    data?: Record<string, Uint8Array>;
    width?: number | string;
    height?: number | string;
    downloadFilename?: string;
    ui?: "viewer" | "stories";
    molstarVersion?: string;
  } = {},
): Promise<{ [Symbol.for("Deno.customInspect")](): string }> {
  const {
    data,
    width = 950,
    height = 600,
    downloadFilename = "molstar_download",
    ui = "viewer",
    molstarVersion = "latest",
  } = options;

  const iframeHtml = await molstarHtml(state, { data, ui, molstarVersion });
  const wrapperId = `molstar_${crypto.randomUUID().replace(/-/g, "")}`;

  const w = typeof width === "string" ? width : `${width}px`;
  const h = typeof height === "string" ? height : `${height}px`;

  // Escape the HTML for embedding in JavaScript
  const escapedHtml = JSON.stringify(iframeHtml).replace(
    /<\/script>/g,
    '</" + "script" + ">',
  );

  // HTML wrapper with JavaScript to create iframe and download link
  const html = `
<div id="${wrapperId}"></div>
<script>
(function() {
  setTimeout(function() {
    var wrapper = document.getElementById("${wrapperId}");
    if (wrapper === null) {
      console.error("Wrapper element #${wrapperId} not found");
      return;
    }

    var blob = new Blob([${escapedHtml}], { type: 'text/html' });
    var url = URL.createObjectURL(blob);

    // Create the iframe
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style = "border: 0; width: ${w}; height: ${h}";
    iframe.allow = "fullscreen";
    iframe.allowFullscreen = true;
    wrapper.appendChild(iframe);

    // Create the download link
    var link = document.createElement('a');
    link.href = url;
    link.download = "${downloadFilename}.html";
    link.innerText = "Download HTML";
    link.style.display = "block";
    link.style.marginTop = "10px";
    wrapper.appendChild(link);
  }, 100);
})();
</script>
  `.trim();

  // Return display object using Jupyter protocol
  return displayHTML(html);
}

/**
 * Save Mol* viewer HTML to a file.
 *
 * Creates a standalone HTML file that can be opened in any web browser.
 * The file includes the full Mol* viewer with your structure embedded.
 *
 * @param filename - Path to save the HTML file
 * @param state - MolViewSpec state to save
 * @param options - HTML generation options
 *
 * @example
 * ```typescript
 * import { createBuilder, saveMolstarHtml } from "./mod.ts";
 *
 * const builder = createBuilder();
 * // ... build your structure ...
 * const state = builder.getState();
 *
 * await saveMolstarHtml("structure.html", state);
 * console.log("Open structure.html in your browser!");
 * ```
 */
export async function saveMolstarHtml(
  filename: string,
  state: SupportedStates,
  options: {
    data?: Record<string, Uint8Array>;
    ui?: "viewer" | "stories";
    molstarVersion?: string;
  } = {},
): Promise<void> {
  const html = molstarHtml(state, options);
  await Deno.writeTextFile(filename, html);
}

// HTML Templates

const VIEWER_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mol* Viewer</title>
        <script src="https://cdn.jsdelivr.net/npm/molstar@{{version}}/build/viewer/molstar.js"></script>
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@{{version}}/build/viewer/molstar.css" />
        <style>
            body { margin: 0; padding: 0; }
            #viewer1 { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
        </style>
    </head>
    <body>
        <div id="viewer1"></div>
        <script>
            var mvsData = {{state}};
            molstar.Viewer
                .create('viewer1', {
                    layoutIsExpanded: false,
                    layoutShowControls: false,
                    viewportShowToggleFullscreen: true,
                    viewportShowExpand: false
                })
                .then(viewer => viewer.loadMvsData(mvsData, '{{format}}'));
        </script>
    </body>
</html>
`;

const STORIES_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mol* Stories</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        #viewer {
            position: absolute;
            left: 0;
            top: 0;
            right: 34%;
            bottom: 0;
        }

        #controls {
            position: absolute;
            left: 66%;
            top: 0;
            right: 0;
            bottom: 0;
            padding: 16px;
            padding-bottom: 20px;
            border: 1px solid #ccc;
            border-left: none;
            background: #F6F5F3;
            z-index: -2;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        @media (orientation:portrait) {
            #viewer {
                position: absolute;
                left: 0;
                top: 0;
                right: 0;
                bottom: 40%;
            }

            #controls {
                position: absolute;
                left: 0;
                top: 60%;
                right: 0;
                bottom: 0;
                border-top: none;
            }

            .msp-viewport-controls-buttons {
                display: none;
            }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/molstar@{{version}}/build/mvs-stories/mvs-stories.js"></script>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@{{version}}/build/mvs-stories/mvs-stories.css" />
</head>
<body>
    <div id="viewer">
        <mvs-stories-viewer />
    </div>
    <div id="controls">
        <mvs-stories-snapshot-markdown style="flex-grow: 1;" />
    </div>

    <script>
        var mvsData = {{state}};

        mvsStories.loadFromData(mvsData, { format: '{{format}}' });
    </script>
</body>
</html>
`;
