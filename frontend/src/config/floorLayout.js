// Dine-in floor layout. Each table has a unique `label` (used as the table key
// stored on dine-in orders). Edit freely — this is just display data.
// (Lives in the frontend because the DB Table.number column is integer-only and
//  can't hold labels like "B1"/"S-Stage". Migrate to DB columns later if needed.)

const mk = (...labels) => labels.map(label => ({ label }))

export const FLOOR_SECTIONS = [
  { name: 'Bar', tables: mk('B1', 'B2', 'B3', 'B4', 'B5', 'B6') },
  { name: 'Stage', tables: mk('S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S-Stage') },
  { name: 'Lobby', tables: mk('L14', 'L15', 'L16', 'L17', 'L18', 'L19', 'L20') },
  { name: 'PDR (Private Dining)', tables: mk('P21', 'P22', 'P23') },
  { name: 'Open Tables', tables: mk('24', '25', '26', '27', '28', '29', '30') },
]

export const ALL_TABLES = FLOOR_SECTIONS.flatMap(s => s.tables.map(t => ({ ...t, section: s.name })))
