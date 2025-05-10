import streamlit as st
import molviewspec as mvs

st.header("Mol* Custom Component")

pdb_id = st.text_input("PDB ID", value="6vjj")

builder = mvs.create_builder()

structure = builder.download(url=f'https://files.wwpdb.org/download/{pdb_id}.cif').parse(format='mmcif').model_structure()

structure.component(selector="polymer").representation().color(custom=dict(molstar_use_default_coloring=True))

structure.component(selector="ligand").representation().color(color="blue")

builder.molstar_streamlit()
