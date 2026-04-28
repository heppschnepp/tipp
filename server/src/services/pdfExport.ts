import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { CellHookData } from 'jspdf-autotable';
import * as fs from 'fs/promises';
import * as path from 'path';

// Extend jsPDF type to include lastAutoTable added by jspdf-autotable
interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

export interface GroupData {
  teams: string[];
  matches: number[][];
}

export interface Groups {
  [key: string]: GroupData;
}

export interface Score {
  homeScore: number | null;
  awayScore: number | null;
}

export interface ScoresMap {
  [key: string]: Score;
}

export interface KnockoutRound {
  id: string;
  name: string;
  matches: number;
}

// Team name to ISO code mapping (mirror of client/src/data/teamFlags.ts)
const TEAM_CODES: Record<string, string> = {
  'Mexico': 'mx',
  'South Africa': 'za',
  'South Korea': 'kr',
  'Czech Republic': 'cz',
  'Canada': 'ca',
  'Bosnia & Herzegovina': 'ba',
  'Qatar': 'qa',
  'Switzerland': 'ch',
  'Brazil': 'br',
  'Morocco': 'ma',
  'Haiti': 'ht',
  'Scotland': 'gb-sct',
  'USA': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Turkey': 'tr',
  'Germany': 'de',
  'Curaçao': 'cw',
  'Ivory Coast': 'ci',
  'Ecuador': 'ec',
  'Netherlands': 'nl',
  'Japan': 'jp',
  'Sweden': 'se',
  'Tunisia': 'tn',
  'Belgium': 'be',
  'Egypt': 'eg',
  'Iran': 'ir',
  'New Zealand': 'nz',
  'Spain': 'es',
  'Cape Verde': 'cv',
  'Saudi Arabia': 'sa',
  'Uruguay': 'uy',
  'France': 'fr',
  'Senegal': 'sn',
  'Iraq': 'iq',
  'Norway': 'no',
  'Argentina': 'ar',
  'Algeria': 'dz',
  'Austria': 'at',
  'Jordan': 'jo',
  'Portugal': 'pt',
  'DR Congo': 'cd',
  'Uzbekistan': 'uz',
  'Colombia': 'co',
  'England': 'gb-eng',
  'Croatia': 'hr',
  'Ghana': 'gh',
  'Panama': 'pa',
  'TBD': 'xx',
};

function getFlagFilename(team: string): string {
  const code = TEAM_CODES[team];
  return code ? `${code}.png` : 'xx.png';
}

export async function generatePdf(
  groups: Groups,
  knockout: KnockoutRound[],
  scoresMap: ScoresMap
): Promise<Buffer> {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.text('World Cup 2026 - Match Results & Predictions', 105, yPos, { align: 'center' });
  yPos += 20;

  // Collect all unique team names for flag pre-fetch
  const allTeams = new Set<string>();
  Object.values(groups).forEach(g => {
    g.teams.forEach(team => allTeams.add(team));
  });
  allTeams.add('TBD');

  // Determine flags directory (relative to server process)
  const FLAGS_DIR = path.resolve(process.cwd(), '..', 'client', 'public', 'flags');

  // Helper to read flag and convert to base64 data URL
  async function loadFlagDataUrl(team: string): Promise<string> {
    const filename = getFlagFilename(team);
    const flagPath = path.join(FLAGS_DIR, filename);
    try {
      const data = await fs.readFile(flagPath);
      const base64 = data.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch {
      console.warn(`Flag image not found for ${team} at ${flagPath}`);
      return '';
    }
  }

  const flagCache = new Map<string, string>();
  await Promise.all(
    Array.from(allTeams).map(async (team) => {
      const dataUrl = await loadFlagDataUrl(team);
      if (dataUrl) {
        flagCache.set(team, dataUrl);
      }
    })
  );

  // Process groups
  Object.keys(groups).sort().forEach((gk) => {
    const g = groups[gk];

    doc.setFontSize(16);
    doc.text(`Group ${gk}`, 10, yPos);
    yPos += 10;

    const tableData = g.matches.map((m, matchIndex) => {
      const key = `g${gk}m${matchIndex}`;
      const t1 = g.teams[m[0]];
      const t2 = g.teams[m[1]];
      const score = scoresMap[key];

      let scoreText = '- : -';
      if (score && score.homeScore !== null && score.awayScore !== null) {
        scoreText = `${score.homeScore} : ${score.awayScore}`;
      }

      return [
        { content: t1, styles: { halign: 'left' as const } },
        { content: scoreText, styles: { halign: 'center' as const } },
        { content: t2, styles: { halign: 'left' as const } }
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Team 1', 'Score', 'Team 2']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        '0': { cellPadding: { left: 12, top: 3, right: 3, bottom: 3 } },
        '2': { cellPadding: { left: 12, top: 3, right: 3, bottom: 3 } }
      },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      bodyStyles: { textColor: 30 },
      didDrawCell: (data: CellHookData) => {
        if ((data.column.index === 0 || data.column.index === 2) && data.row.index > 0) {
          const rowCells = data.row.raw as Array<{ content: string }>;
          const teamName = rowCells[data.column.index].content;
          const dataUrl = flagCache.get(teamName);
          if (dataUrl) {
            const cell = data.cell;
            const imgWidth = 8;
            const imgHeight = 5;
            const imgX = cell.x + 2;
            const imgY = cell.y + (cell.height - imgHeight) / 2;
            try {
              (data.doc as jsPDF).addImage(dataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight);
            } catch (err) {
              console.error('Failed to add flag image', err);
            }
          }
        }
      }
    });

    const finalY = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY;
    yPos = finalY !== undefined ? finalY + 15 : yPos + 20;

    if (yPos > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPos = 20;
    }

    yPos += 10;
  });

  // Knockout stage
  if (knockout && knockout.length > 0) {
    doc.setFontSize(16);
    doc.text('Knockout Stage', 10, yPos);
    yPos += 10;

    knockout.forEach((round) => {
      doc.setFontSize(14);
      doc.text(round.name, 10, yPos);
      yPos += 8;

      const roundTableData = Array.from({ length: round.matches }).map((_, i) => {
        const key = `ko_${round.id}_${i}`;
        const score = scoresMap[key];
        let scoreText = '- : -';
        if (score && score.homeScore !== null && score.awayScore !== null) {
          scoreText = `${score.homeScore} : ${score.awayScore}`;
        }
        return [
          { content: 'TBD', styles: { halign: 'left' as const } },
          { content: scoreText, styles: { halign: 'center' as const } },
          { content: 'TBD', styles: { halign: 'left' as const } }
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Team 1', 'Score', 'Team 2']],
        body: roundTableData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          '0': { cellPadding: { left: 12, top: 3, right: 3, bottom: 3 } },
          '2': { cellPadding: { left: 12, top: 3, right: 3, bottom: 3 } }
        },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        bodyStyles: { textColor: 30 },
        didDrawCell: (data: CellHookData) => {
          if ((data.column.index === 0 || data.column.index === 2) && data.row.index > 0) {
            const rowCells = data.row.raw as Array<{ content: string }>;
            const teamName = rowCells[data.column.index].content;
            const dataUrl = flagCache.get(teamName);
            if (dataUrl) {
              const cell = data.cell;
              const imgWidth = 8;
              const imgHeight = 5;
              const imgX = cell.x + 2;
              const imgY = cell.y + (cell.height - imgHeight) / 2;
              try {
                (data.doc as jsPDF).addImage(dataUrl, 'PNG', imgX, imgY, imgWidth, imgHeight);
              } catch (err) {
                console.error('Failed to add flag image', err);
              }
            }
          }
        }
      });

      const finalY = (doc as JsPDFWithAutoTable).lastAutoTable?.finalY;
      yPos = finalY !== undefined ? finalY + 15 : yPos + 20;

      if (yPos > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20;
      }

      yPos += 10;
    });
  }

  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}
