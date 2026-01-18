import { ReactNode, useState } from "react";
import { EditorWithViewer as EditorWithViewerPreact } from "@molstar/molstar-components";

// Type cast to work around Preact/React type incompatibility
const EditorWithViewer = EditorWithViewerPreact as any;

export interface ExampleSpec {
  header: string;
  description: ReactNode;
  name: string;
  javascript: string;
}

export const Examples: ExampleSpec[] = [
  {
    header: "Basic",
    description:
      "Load a molecule from URL (PDB ID 1cbs) and display default representation (cartoon) in blue color.",
    name: "basic",
    javascript: `const structure = builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1cbs_updated.cif' })
  .parse({ format: 'mmcif' })
  .modelStructure();

structure
  .component()
  .representation()
  .color({ color: 'blue' });`,
  },
  {
    header: "Labels",
    description: "A molecule (PDB ID 1lap) visualization with a custom labels.",
    name: "label",
    javascript: `const structure = builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1lap_updated.cif' })
  .parse({ format: 'mmcif' })
  .modelStructure();

// Represent everything as cartoon & color residue 120 red
const whole = structure.component();
whole
  .representation()
  .color({
    color: 'red',
    selector: { label_asym_id: 'A', label_seq_id: 120 }
  });

// Label the residue with custom text & focus it
structure
  .component({ selector: { label_asym_id: 'A', label_seq_id: 120 } })
  .label({ text: 'ALA 120 A: My Label' })
  .focus();`,
  },
  {
    header: "Components",
    description:
      "An aaRS (PDB ID 1c0a) visualization with different selections. Protein in orange, RNA in blue, ligand in green, and active site residues colored red.",
    name: "components",
    javascript: `const structure = builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1c0a_updated.cif' })
  .parse({ format: 'mmcif' })
  .assemblyStructure();

// Represent protein & RNA as cartoon
structure
  .component({ selector: 'protein' })
  .representation()
  .color({ color: '#e19039' });

structure
  .component({ selector: 'nucleic' })
  .representation()
  .color({ color: '#4b7fcc' });

// Represent ligand in active site as ball-and-stick
const ligand = structure.component({ selector: { label_asym_id: 'E' } });
ligand
  .representation({ type: 'ball_and_stick' })
  .color({ color: '#229954' });

// Represent 2 crucial arginine residues as red ball-and-stick
const arg_b_217 = structure.component({
  selector: { label_asym_id: 'B', label_seq_id: 217 }
});
arg_b_217
  .representation({ type: 'ball_and_stick' })
  .color({ color: '#ff0000' });
arg_b_217.label({ text: 'aaRS Class II Signature' });

const arg_b_537 = structure.component({
  selector: { label_asym_id: 'B', label_seq_id: 537 }
});
arg_b_537
  .representation({ type: 'ball_and_stick' })
  .color({ color: '#ff0000' });
arg_b_537.label({ text: 'aaRS Class II Signature' });

// Position camera to zoom in on ligand and signature residues
structure.component({
  selector: [
    { label_asym_id: 'E' },
    { label_asym_id: 'B', label_seq_id: 217 },
    { label_asym_id: 'B', label_seq_id: 537 }
  ]
}).focus();`,
  },
  {
    header: "Superposition",
    description: "Two molecules superposed by applying a matrix transform.",
    name: "superposition",
    javascript: `// Load first structure and color it red
builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/4hhb_updated.cif' })
  .parse({ format: 'mmcif' })
  .modelStructure()
  .component()
  .representation()
  .color({ color: 'red' });

// Load second structure, apply matrix transform, and color it blue
builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1oj6_updated.cif' })
  .parse({ format: 'mmcif' })
  .modelStructure()
  .transform({
    rotation: [
      -0.7202161, -0.33009904, -0.61018308,
      0.36257631, 0.57075962, -0.73673053,
      0.59146191, -0.75184312, -0.29138417
    ],
    translation: [-12.54, 46.79, 94.50]
  })
  .component()
  .representation()
  .color({ color: 'blue' });`,
  },
  {
    header: "Symmetry Mates",
    description:
      "Load a molecule determined by X-ray crystallography (PDB ID 1tqn) and display crystal symmetry mates by specifying Miller indices.",
    name: "symmetry",
    javascript: `const structure = builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn_updated.cif' })
  .parse({ format: 'mmcif' })
  .symmetryStructure({ ijk_min: [-1, -1, -1], ijk_max: [1, 1, 1] });

structure
  .component()
  .representation()
  .color({ color: 'teal' });`,
  },
  {
    header: "Annotations",
    description:
      "Load a structure (PDB ID 1h9t) and apply coloring and labels based on data from an MVS annotation file.",
    name: "annotations",
    javascript: `const structureUrl = 'https://files.wwpdb.org/download/1h9t.cif';
const annotationUrl = 'https://molstar.org/mol-view-spec/examples/annotations/annotations-1h9t.cif';

// Load structure
const structure = builder
  .download({ url: structureUrl })
  .parse({ format: 'mmcif' })
  .modelStructure();

// Create components using MVS annotations
const protein = structure.componentFromUri({
  uri: annotationUrl,
  format: 'cif',
  block_header: '1h9t_annotations',
  category_name: 'components',
  field_name: 'component',
  field_values: ['Protein'],
  schema: 'chain'
});

const dna = structure.componentFromUri({
  uri: annotationUrl,
  format: 'cif',
  category_name: 'components',
  field_name: 'component',
  field_values: ['DNA'],
  schema: 'chain'
});

const ions = structure.componentFromUri({
  uri: annotationUrl,
  format: 'cif',
  category_name: 'components',
  field_name: 'component',
  field_values: ['Gold', 'Chloride'],
  schema: 'chain'
});

// Create representations with coloring from annotations
protein.representation({ type: 'cartoon' }).colorFromUri({
  uri: annotationUrl,
  format: 'cif',
  block_header: '1h9t_annotations',
  category_name: 'annotations',
  schema: 'residue_range'
});

dna.representation({ type: 'ball_and_stick' }).colorFromUri({
  uri: annotationUrl,
  format: 'cif',
  category_name: 'annotations',
  schema: 'residue_range'
});

ions.representation({ type: 'surface' }).colorFromUri({
  uri: annotationUrl,
  format: 'cif',
  category_name: 'annotations',
  schema: 'residue_range'
});

// Add labels from annotations
structure.labelFromUri({
  uri: annotationUrl,
  format: 'cif',
  block_header: '1h9t_annotations',
  category_name: 'annotations',
  field_name: 'label',
  schema: 'residue_range'
});`,
  },
  {
    header: "Primitives",
    description: "Draw various geometrical primitives.",
    name: "primitives",
    javascript: `builder.primitives({ opacity: 0.66 })
  .ellipse({
    color: 'red',
    center: [1, 1, 1],
    major_axis: [1.5, 0, 0],
    minor_axis: [0, 2, 0],
    theta_start: 0,
    theta_end: Math.PI / 2,
    tooltip: 'XY',
  })
  .ellipse({
    color: 'green',
    center: [1, 1, 1],
    major_axis_endpoint: [1.5 + 1, 0 + 1, 0 + 1],
    minor_axis_endpoint: [0 + 1, 0 + 1, 1 + 1],
    theta_start: 0,
    theta_end: Math.PI / 2,
    tooltip: 'XZ',
  })
  .ellipse({
    color: 'blue',
    center: [1, 1, 1],
    major_axis: [0, 10, 0],
    minor_axis: [0, 0, 1],
    radius_major: 2,
    radius_minor: 1,
    theta_start: 0,
    theta_end: Math.PI / 2,
    tooltip: 'YZ',
  })
  .arrow({
    start: [1, 1, 1],
    end: [1 + 1.5, 1 + 0, 1 + 0],
    tube_radius: 0.05,
    length: 1.5 + 0.2,
    show_end_cap: true,
    color: '#ffff00',
    tooltip: 'X',
  })
  .arrow({
    start: [1, 1, 1],
    direction: [0, 2 + 0.2, 0],
    tube_radius: 0.05,
    show_end_cap: true,
    color: '#ff00ff',
    tooltip: 'Y',
  })
  .arrow({
    end: [1, 1, 1],
    start: [1 + 0, 1 + 0, 1 + 1 + 0.2],
    show_start_cap: true,
    tube_radius: 0.05,
    color: '#00ffff',
    tooltip: 'Z',
  });

builder.primitives({ opacity: 0.33 })
  .ellipsoid({
    center: [1, 1, 1],
    major_axis: [1, 0, 0],
    minor_axis: [0, 1, 0],
    radius: [1.5, 2, 1],
    color: '#cccccc',
  });`,
  },
  {
    header: "Volumes",
    description: "Load a structure and a volume from the Mol* Volume Server.",
    name: "volumes",
    javascript: `const structure = builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn_updated.cif' })
  .parse({ format: 'mmcif' })
  .modelStructure();

structure
  .component({ selector: 'polymer' })
  .representation({ type: 'cartoon' })
  .color({ color: 'white' });

const ligand = structure.component({ selector: 'ligand' });
ligand
  .representation({ type: 'ball_and_stick' })
  .color({ custom: { molstar_color_theme_name: 'element-symbol' } });

ligand.focus({
  up: [0.98, -0.19, 0],
  direction: [-28.47, -17.66, -16.32],
  radius: 14,
  radius_extent: 5
});

const volume_data = builder
  .download({
    url: 'https://www.ebi.ac.uk/pdbe/densities/x-ray/1tqn/box/-22.367,-33.367,-21.634/-7.106,-10.042,-0.937?detail=3'
  })
  .parse({ format: 'bcif' });

volume_data
  .volume({ channel_id: '2FO-FC' })
  .representation({
    type: 'isosurface',
    relative_isovalue: 1.5,
    show_wireframe: true,
    show_faces: false,
  })
  .color({ color: 'blue' })
  .opacity({ opacity: 0.3 });

const fo_fc = volume_data.volume({ channel_id: 'FO-FC' });
fo_fc
  .representation({
    type: 'isosurface',
    relative_isovalue: 3,
    show_wireframe: true
  })
  .color({ color: 'green' })
  .opacity({ opacity: 0.3 });

fo_fc
  .representation({
    type: 'isosurface',
    relative_isovalue: -3,
    show_wireframe: true
  })
  .color({ color: 'red' })
  .opacity({ opacity: 0.3 });`,
  },
];

export function ExamplesUI() {
  const [example, setExample] = useState<ExampleSpec>(Examples[0]);
  return (
    <>
      <div style={{ textAlign: "center", marginTop: 20, padding: "0 20px" }}>
        <div className="examples">
          {Examples.map((e, i) => (
            <ExamplePreview
              key={i}
              example={e}
              setCurrent={() => setExample(e)}
              current={example === e}
            />
          ))}
        </div>
      </div>
      <div style={{ margin: "20px auto", padding: "0 40px", maxWidth: 1980 }}>
        <CurrentExample example={example} />
      </div>
    </>
  );
}

function ExamplePreview({
  example,
  setCurrent,
  current,
}: {
  example: ExampleSpec;
  setCurrent: () => void;
  current?: boolean;
}) {
  return (
    <div className="tooltip">
      <a
        href="#"
        className={current ? "current" : undefined}
        onClick={(e) => {
          e.preventDefault();
          setCurrent();
        }}
      >
        <img alt={example.header} src={`examples/${example.name}/thumb.png`} />
      </a>
      <p className="tooltip-info">
        <b>{example.header}:</b> {example.description}
      </p>
    </div>
  );
}

function CurrentExample({ example }: { example: ExampleSpec }) {
  return (
    <>
      <div
        className="row"
        style={{
          marginBottom: 10,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div className="twelve columns" style={{ textAlign: "center" }}>
          <b>{example.header}:</b>
          <br /> {example.description}
        </div>
      </div>
      <div style={{ display: "flex", width: "100%", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "1200px" }}>
          <EditorWithViewer
            key={example.name}
            initialCode={example.javascript}
            layout="horizontal"
            editorHeight="500px"
            viewerHeight="500px"
            autoRun={true}
            autoRunDelay={1000}
            showBottomControlPanel={false}
          />
        </div>
      </div>
    </>
  );
}
