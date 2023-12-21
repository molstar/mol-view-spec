import re

from setuptools import setup

name = "molviewspec"

with open("molviewspec/__init__.py", "r", encoding="utf-8") as fd:
    match = re.search(r'^__version__\s*=\s*[\'"]([^\'"]*)[\'"]', fd.read(), re.MULTILINE)
    version = match.group(1) if match is not None else None

with open("README.md", "r", encoding="utf-8") as ifh:
    longDescription = ifh.read()

if not version:
    raise RuntimeError("Cannot find version information")

setup(
    name=name,
    packages=[name],
    version=version,
    license="MIT",
    description="Generate Mol* views using this simple Python library, which allows you to compose complex scenes in a "
    "step-wise manner.",
    long_description_content_type="text/markdown",
    long_description=longDescription,
    author="Sebastian Bittrich, Adam Midlik, David Sehnal",
    author_email="sebastian.bittrich@rcsb.org, midlik@ebi.ac.uk, david.sehnal@gmail.com",
    url="https://github.com/molstar/mol-view-spec",
    download_url="https://github.com/molstar/mol-view-spec/archive/v" + version + ".tar.gz",
    keywords=[
        "molecular graphics",
        "scientific visualization",
        "web graphics",
        "view specification",
        "scene building",
        "Mol*",
    ],
    install_requires=["pydantic<2"],
    classifiers=[
        "Development Status :: 3 - Alpha",
        # "Development Status :: 4 - Beta",
        # 'Development Status :: 5 - Production/Stable',
        "Intended Audience :: Science/Research",
        "Topic :: Software Development :: Build Tools",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Topic :: Scientific/Engineering :: Bio-Informatics",
        "Natural Language :: English",
        "Typing :: Typed",
    ],
)
