import json
import uuid
from io import BytesIO
import zipfile
import base64
from molviewspec.nodes import MVSData


def molstar_html(state: str | dict | MVSData, data=None):
    """Create an HTML string to display a Mol* viewer with the given state."""
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
    else:
        raise TypeError(f"State should be str, dict, State or States, got: {type(state).__name__}: {state}")

    if data is not None:
        zip_data = BytesIO()
        with zipfile.ZipFile(zip_data, 'w') as zipf:
            zipf.writestr('index.mvsj', state)
            for path, file_contents in data.items():
                zipf.writestr(path, file_contents)
        state = 'base64,' + base64.b64encode(zip_data.getvalue()).decode('utf-8')
        format = 'mvsx'
    else:
        format = 'mvsj'

    return f'''
    <!DOCTYPE html>
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
                const mvsData = {json.dumps(state)};
                molstar.Viewer
                    .create('viewer1', {{ layoutIsExpanded: false, layoutShowControls: false }})
                    .then(viewer => viewer.loadMvsData(mvsData, '{format}'));
            </script>
        </body>
    </html>
    '''

def molstar_notebook(state: str | dict | MVSData, data: dict[str, bytes]=None, width=950, height=600, download_filename='molstar_download'):
    """
    Visualize a state as a Molstar HTML component for Jupyter or Google Colab.

    :param state: MolViewSpec state(s) - string from builder.get_state(), or the State or States object itself
    :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
    :param width: width of the Molstar viewer (default: 950)
    :param height: height of the Molstar viewer (default: 600)
    :param download_filename: filename for the Molstar HTML file (default: "molstar_download")
    """
    from IPython.display import display, HTML, Javascript

    iframe_html = molstar_html(state, data=data)

    # We turn "...</script>" into "...</script" + ">" to avoid closing script tag in VScode
    html_string = json.dumps(iframe_html).replace('</script>', '</" + "script" + ">')

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
