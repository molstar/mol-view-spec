import base64
import json
import uuid
import zipfile
from io import BytesIO
from typing import Literal

from molviewspec.builder import Root as BuilderRoot
from molviewspec.nodes import MVSJ, MVSX, MVSData, State, States

SupportedStates = str | dict | BuilderRoot | MVSData | bytes | MVSX | MVSJ


def molstar_html(
    state: SupportedStates,
    data: dict[str, bytes] | None = None,
    ui: Literal["viewer", "stories"] = "viewer",
    molstar_version: str = "latest",
):
    """
    Create an HTML string to display a Mol* viewer with the given state.

    :param state: MolViewSpec state(s) - JSON string, State, States, MVSJ, MVSX, bytes, dict, or Builder Root
    :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
    :param ui: "viewer" or "stories" (default: "viewer")
    :param molstar_version: Mol* version to use (default: "latest")
    """

    format = "mvsj"

    if isinstance(state, str):
        pass
    elif isinstance(state, BuilderRoot):
        state = state.get_state().dumps()
    elif isinstance(state, dict):
        state = json.dumps(state)
    elif isinstance(state, MVSJ) or isinstance(state, State) or isinstance(state, States):
        state = state.dumps(indent=None)
    elif isinstance(state, MVSX):
        if data is not None:
            print("Warning: data is ignored when state is MVSX")
            data = None

        state = "base64," + base64.b64encode(state.dumps()).decode("utf-8")
        format = "mvsx"
    elif isinstance(state, bytes):
        if data is not None:
            print("Warning: data is ignored when state is MVSX bytes")
            data = None

        state = "base64," + base64.b64encode(state).decode("utf-8")
        format = "mvsx"
    else:
        raise TypeError(f"State should be str, dict, State or States, got: {type(state).__name__}: {state}")

    if data is not None:
        zip_data = BytesIO()
        with zipfile.ZipFile(zip_data, "w") as zipf:
            zipf.writestr("index.mvsj", state)
            for path, file_contents in data.items():
                zipf.writestr(path, file_contents)
        state = "base64," + base64.b64encode(zip_data.getvalue()).decode("utf-8")
        format = "mvsx"

    template = STORIES_TEMPLATE if ui == "stories" else VIEWER_TEMPLATE
    template = (
        template.replace("{{version}}", molstar_version)
        .replace("{{format}}", format)
        .replace("{{state}}", json.dumps(state))
    )

    return template


def molstar_notebook(
    state: SupportedStates,
    data: dict[str, bytes] | None = None,
    width: int | str = 950,
    height: int | str = 600,
    download_filename: str = "molstar_download",
    ui: Literal["viewer", "stories"] = "viewer",
    molstar_version: str = "latest",
):
    """
    Visualize a state as a Molstar HTML component for Jupyter or Google Colab.

    :param state: MolViewSpec state(s) - JSON string, State, States, MVSJ, MVSX, bytes, dict, or Builder Root
    :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
    :param width: width of the Molstar viewer (default: 950)
    :param height: height of the Molstar viewer (default: 600)
    :param download_filename: filename for the Molstar HTML file (default: "molstar_download")
    :param ui: "viewer" or "stories" (default: "viewer")
    :param molstar_version: Mol* version to use (default: "latest")
    """
    from IPython.display import HTML, Javascript, display

    iframe_html = molstar_html(state, data=data, ui=ui, molstar_version=molstar_version)

    # We turn "...</script>" into "...</script" + ">" to avoid closing script tag in VScode
    html_string = json.dumps(iframe_html).replace("</script>", '</" + "script" + ">')

    wrapper_id = f"molstar_{uuid.uuid4()}"

    w = width if isinstance(width, str) else f"{width}px"
    h = height if isinstance(height, str) else f"{height}px"

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
        iframe.style = "border: 0; width: {w}; height: {h}"
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


def molstar_streamlit(
    state: SupportedStates,
    data: dict[str, bytes] | None = None,
    width: int | None = None,
    height: int | None = 500,
    ui: Literal["viewer", "stories"] = "viewer",
    molstar_version: str = "latest",
):
    """
    Show Mol* viewer in a Streamlit app.

    :param state: MolViewSpec state(s) - JSON string, State, States, MVSJ, MVSX, bytes, dict, or Builder Root
    :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
    :param width: width of the Molstar viewer (default: 950)
    :param height: height of the Molstar viewer (default: 600)
    :param download_filename: filename for the Molstar HTML file (default: "molstar_download")
    :param ui: "viewer" or "stories" (default: "viewer")
    :param molstar_version: Mol* version to use (default: "latest")

    :return: Streamlit HTML component
    """
    import streamlit.components.v1 as components

    iframe_html = molstar_html(state, data=data, ui=ui, molstar_version=molstar_version)
    return components.html(iframe_html, width=width, height=height)


VIEWER_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
    <head>
        <script src="https://cdn.jsdelivr.net/npm/molstar@{{version}}/build/viewer/molstar.js"></script>
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/molstar@{{version}}/build/viewer/molstar.css" />
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
"""

STORIES_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
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
"""
