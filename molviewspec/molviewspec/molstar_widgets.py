import base64
import json
import uuid
import zipfile
from io import BytesIO
from typing import Literal

from molviewspec.nodes import MVSJ, MVSX, MVSData


def molstar_html(
    state: str | dict | MVSData | bytes | MVSX | MVSJ, data=None, ui: Literal["viewer", "stories"] = "viewer"
):
    """Create an HTML string to display a Mol* viewer with the given state."""

    format = "mvsj"

    if isinstance(state, str):
        pass
    elif isinstance(state, dict):
        state = json.dumps(state)
    elif isinstance(state, MVSData):
        # convert state to JSON string
        if hasattr(state, "model_dump_json"):
            # pydantic v1 compatibility
            state = state.model_dump_json(exclude_none=True)
        else:
            state = state.json(exclude_none=True)
    elif isinstance(state, MVSJ):
        state = state.dumps()
    elif isinstance(state, MVSX):
        state = "base64," + base64.b64encode(state.dumps()).decode("utf-8")
        format = "mvsx"
    elif isinstance(state, bytes):
        state = "base64," + base64.b64encode(state).decode("utf-8")
        format = "mvsx"
    else:
        raise TypeError(f"State should be str, dict, State or States, got: {type(state).__name__}: {state}")

    if not isinstance(state, MVSX) and not isinstance(state, bytes) and data is not None:
        zip_data = BytesIO()
        with zipfile.ZipFile(zip_data, "w") as zipf:
            zipf.writestr("index.mvsj", state)
            for path, file_contents in data.items():
                zipf.writestr(path, file_contents)
        state = "base64," + base64.b64encode(zip_data.getvalue()).decode("utf-8")
        format = "mvsx"

    template = STORIES_TEMPLATE if ui == "stories" else VIEWER_TEMPLATE
    template = template.replace("{{format}}", format).replace("{{state}}", json.dumps(state))

    return template


def molstar_notebook(
    state: str | dict | MVSData | MVSX,
    data: dict[str, bytes] = None,
    width=950,
    height=600,
    download_filename="molstar_download",
    ui: Literal["viewer", "stories"] = "viewer",
):
    """
    Visualize a state as a Molstar HTML component for Jupyter or Google Colab.

    :param state: MolViewSpec state(s) - string from builder.get_state(), or the State or States object itself
    :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
    :param width: width of the Molstar viewer (default: 950)
    :param height: height of the Molstar viewer (default: 600)
    :param download_filename: filename for the Molstar HTML file (default: "molstar_download")
    """
    from IPython.display import HTML, Javascript, display

    iframe_html = molstar_html(state, data=data, ui=ui)

    # We turn "...</script>" into "...</script" + ">" to avoid closing script tag in VScode
    html_string = json.dumps(iframe_html).replace("</script>", '</" + "script" + ">')

    wrapper_id = f"molstar_{uuid.uuid4()}"

    # JavaScript code to create a Blob URL and a download link
    js_code = f"""
    setTimeout(function(){{
        var wrapper = document.getElementById("{wrapper_id}")
        if (wrapper === null) {{
            throw new Error("Wrapper element #{wrapper_id} not found anymore")
        }}
        var blob = new Blob([{html_string}], {{ type: 'text/html' }});
        var url = URL.createObjectURL(blob);

        // Create the iframe
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style = "border: 0; width: {width}px; height: {height}px"
        iframe.allow = "fullscreen";
        iframe.allowFullscreen = true;
        wrapper.appendChild(iframe);

        // Create the download link
        var link = document.createElement('a');
        link.href = url;
        link.download = "{download_filename}.html";
        link.innerText = "Download HTML";
        link.style.display = "block";
        link.style.marginTop = "10px";
        wrapper.appendChild(link);
    }}, 100);
    """

    # Display the iframe
    display(HTML(f'<div id="{wrapper_id}"></div>'))
    display(Javascript(js_code))


def molstar_streamlit(state: str | dict | MVSData, data=None, width=None, height=500):
    """Show Mol* viewer in a Streamlit app."""
    import streamlit.components.v1 as components

    iframe_html = molstar_html(state, data=data)
    return components.html(iframe_html, width=width, height=height)


VIEWER_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
    <head>
        <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
        <script src="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.js"></script>
        <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@latest/build/viewer/molstar.css" />
    </head>
    <body>
        <div id="viewer1"></div>
        <script>
            var mvsData = {{state}};
            molstar.Viewer
                .create('viewer1', { layoutIsExpanded: false, layoutShowControls: false })
                .then(viewer => viewer.loadMvsData(mvsData, '{{format}}'));
        </script>
    </body>
</html>
"""

STORIES_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <title>Molecular Stories</title>
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

        #links {
            position: absolute;
            bottom: 4px;
            right: 8px;
            font-family: "Raleway", "HelveticaNeue", "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-size: 0.6rem;
            z-index: -1;
            color: #666;
        }

        #links a {
            color: #666;
            text-decoration: none;
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

            .markdown-explanation {
                font-size: 0.9rem !important;    
            }

            .markdown-explanation h3 {
                font-size: 1.5rem !important;
            }

            .msp-viewport-controls-buttons {
                display: none;
            }
        }
    </style>
    <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
    <script src="https://molstar.org/demos/mvs-stories/index.js"></script>
    <!-- Replace "latest" by the specific version you want to use, e.g. "4.0.0" -->
    <link rel="stylesheet" type="text/css" href="https://molstar.org/demos/mvs-stories/molstar.css" />
</head>
<body>
    <div id="viewer">
        <mc-viewer name="v1" />
    </div>
    <div id="controls">
        <div class="markdown-explanation" style="flex-grow: 1;">
            <mc-snapshot-markdown viewer-name="v1" />
        </div>
    </div>

    <script>
        var mvsData = {{state}};
        setTimeout(() => {
            window.mc.getContext().dispatch({
                kind: 'load-mvs',
                format: '{{format}}',
                data: JSON.parse(mvsData),
            });
        }, 0);
    </script>
</body>
</html>
"""
