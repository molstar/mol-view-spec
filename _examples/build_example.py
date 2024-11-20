from molviewspec.molviewspec.builder import create_builder
from molviewspec.molviewspec.nodes import ComponentExpression


builder = create_builder()

download = builder.download(url="https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn_updated.cif")
structure = download.parse(format="mmcif").model_structure()

component1 = structure.component(selector="ligand").representation(type="ball_and_stick")
structure.component(selector="polymer").representation(type="cartoon")
structure.primitives().box(center=ComponentExpression(auth_seq_id=508), extent=[5,5,5], color="green")  # or .cage

# TODO: debug at frontend then try these params
builder.primitives().box(
    center=[0.1, 0.1, 0.1],
    extent=[1.0, 1.0, 1.0],
    color="red",
    scaling=[10.0, 1.0, 1.0],
    translation=[10.0, 10.0, 10.0],
    rotation_axis=[0.0, 1.0, 0.0],
    rotation_radians=1.0
)

structure.primitives().cage(
    # center=[0.5, 0.5, 0.5],
    center=ComponentExpression(auth_seq_id=508),
    extent=[5.0, 3.0, 18.0],
    color="orange",
    scaling=[10.0, 1.0, 1.0],
    translation=[10.0, 10.0, 10.0],
    rotation_axis=[0.0, 1.0, 0.0],
    rotation_radians=1.0,
    edge_radius=7.5,
    # TODO: as geometry
    type="as_lines"
)

structure.primitives().cone(
    radius_bottom=1.5,
    radius_top=2.5,
    bottom_cap=True,
    top_cap=False,
    color="magenta",
    # bottom=[1, 1, 1],
    # up=[2,5,10]
    bottom=ComponentExpression(auth_seq_id=508),
    up=ComponentExpression(auth_seq_id=399) 
)  

builder.primitives().box(
    center=[10, 10, 10],
    extent=[2.0, 3.0, 10.0],
    color="blue"
)


# let's throw in some lines and labels that intersect each face in the middle
# (
#     builder.primitives(color="blue", label_color="blue", tooltip="Generic Axis", transparency=0.5)
#     # chain primitives to create desired visuals
#     .line(start=(-0.5, 0.5, 0.5), end=(1.5, 0.5, 0.5), thickness=0.05, color="red", tooltip="### Axis\nX")
#     # .label(position=(-0.5, 0.5, 0.5), text="X", label_size=0.33, label_color="orange")
#     .line(start=(0.5, -0.5, 0.5), end=(0.5, 1.5, 0.5), thickness=0.05, color="green", tooltip="### Axis\nY")
#     # .label(position=(0.5, -0.5, 0.5), text="Y", label_size=0.33, label_color="blue")
#     .line(start=(0.5, 0.5, -0.5), end=(0.5, 0.5, 1.5), thickness=0.05, color="magenta")
#     # .label(position=(0.5, 0.5, -0.5), text="Z", label_size=0.33, color="yellow")
# )
# builder.primitives().mesh(
#     vertices=[
#         0.0, 0.0, 0.0,
#         1.0, 0.0, 0.0,
#         1.0, 1.0, 0.0,
#         0.0, 1.0, 0.0,
#         0.0, 0.0, 1.0,
#         1.0, 0.0, 1.0,
#         1.0, 1.0, 1.0,
#         0.0, 1.0, 1.0,
#     ],
#     indices=[
#         # bottom
#         0, 2, 1, 0, 3, 2,
#         # top
#         4, 5, 6, 4, 6, 7,
#         # front
#         0, 1, 5, 0, 5, 4,
#         # back
#         2, 3, 7, 2, 7, 6,
#         # left
#         0, 7, 3, 0, 4, 7,
#         # right
#         1, 2, 6, 1, 6, 5,
#     ],
#     triangle_groups=[0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
#     group_colors={0: "red", 1: "green", 2: "blue", 3: "yellow", 4: "magenta", 5: "cyan"},
#     group_tooltips={0: "### Side\nbottom", 1: "### Side\ntop", 2: "### Side\nfront", 3: "### Side\nback", 4: "### Side\nleft", 5: "### Side\nright"},
#     show_wireframe=True,
#     wireframe_radius=2,
#     wireframe_color="black",
# )
# # let's throw in some lines and labels that intersect each face in the middle
# (
#     builder.primitives(color="blue", label_color="blue", tooltip="Generic Axis", transparency=0.5)
#     # chain primitives to create desired visuals
#     .line(start=(-0.5, 0.5, 0.5), end=(1.5, 0.5, 0.5), thickness=0.05, color="red", tooltip="### Axis\nX")
#     .label(position=(-0.5, 0.5, 0.5), text="X", label_size=0.33, label_color="red")
#     .line(start=(0.5, -0.5, 0.5), end=(0.5, 1.5, 0.5), thickness=0.05, color="green", tooltip="### Axis\nY")
#     .label(position=(0.5, -0.5, 0.5), text="Y", label_size=0.33, label_color="green")
#     .line(start=(0.5, 0.5, -0.5), end=(0.5, 0.5, 1.5), thickness=0.05)
#     .label(position=(0.5, 0.5, -0.5), text="Z", label_size=0.33)
# )

builder.save_state(destination='./_examples/state.mvsj')