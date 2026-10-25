// Authored content: five teaching days + one no-hint transfer day.
import type { Rng } from '../genetics/cross';
import type { Env, GeneId, Pheno } from '../genetics/genes';

export interface CreatureSpec {
  key: string;
  name: string;
  /** Compact genotype, e.g. "Ee pp". Genes not listed use the day-neutral default. */
  geno: string;
  loc: 'meadow' | 'belt' | 'away';
  env?: Env;
  /** Genotype the player is TOLD (village tag / ranch records). Feeds the deduction engine. */
  fact?: string;
  tagHe?: string;
  /** Higher = flashier. Used only by tests for the "always breed the prettiest" strategy. */
  pretty?: number;
  sex?: 'f' | 'm';
}

export type Requirement =
  | { kind: 'phenotype'; pheno: Partial<Record<GeneId, Pheno>>; bredOnly?: boolean }
  /** Shows the dominant trait but must truly be heterozygous; `wildOnly` = one of the day's wild candidates. */
  | { kind: 'carrier'; gene: GeneId; wildOnly?: boolean }
  /** Two creatures with the phenotype that must truly be homozygous (a pure line). */
  | { kind: 'purePair'; gene: GeneId; pheno: Pheno }
  /** Siblings from the same two parents covering every listed phenotype. */
  | { kind: 'family'; gene: GeneId; phenos: Pheno[] }
  /** A creature with `pheno` that has a parent showing `parentPheno`. */
  | { kind: 'parentPheno'; pheno: Partial<Record<GeneId, Pheno>>; parentPheno: Partial<Record<GeneId, Pheno>> };

export interface OrderDef {
  id: string;
  titleHe: string;
  req: Requirement;
  /** Phenotype shown in the order picture. */
  icon: Partial<Record<GeneId, Pheno>>;
}

export interface PedigreeDef {
  /** Candidate key -> [parent key, parent key] (parents are 'away' creatures). */
  parents: Record<string, [string, string]>;
  noteHe: string;
}

export interface DayDef {
  id: string;
  num: number;
  titleHe: string;
  introHe: string;
  genes: GeneId[];
  eggs: number;
  /** Extra eggs granted once if the first basket runs out (day 1 only). */
  bonusEggs?: number;
  hints: boolean;
  lens: boolean;
  autoDeduce: boolean;
  coldNest: boolean;
  island: 'ranch' | 'show';
  roster(rng: Rng): CreatureSpec[];
  orders: OrderDef[];
  hintsHe: string[];
  pedigree?: PedigreeDef;
  /** One-line science takeaway shown on the win card. */
  takeawayHe: string;
}

export const DAYS: DayDef[] = [
  {
    id: 'd1-big-ears',
    num: 1,
    titleHe: 'אוזניים גדולות',
    introHe: 'בובו ולולו נראים זקופי־אוזניים, אבל שניהם נשאים (Ee) של אוזניים שמוטות. השיגו מהם גור עם אוזניים שמוטות!',
    genes: ['ears'],
    eggs: 8,
    bonusEggs: 4,
    hints: true,
    lens: true,
    autoDeduce: true,
    coldNest: false,
    island: 'ranch',
    roster: () => [
      { key: 'bobo', name: 'בובו', geno: 'Ee', loc: 'meadow', fact: 'Ee', tagHe: 'נשא' },
      { key: 'lulu', name: 'לולו', geno: 'Ee', loc: 'meadow', fact: 'Ee', tagHe: 'נשא' },
    ],
    orders: [{ id: 'floppy', titleHe: 'פופי עם אוזניים שמוטות', req: { kind: 'phenotype', pheno: { ears: 'floppy' } }, icon: { ears: 'floppy' } }],
    hintsHe: [
      'שאבו את שני הפופים, הניחו אותם בקן ולחצו על הביצה.',
      'רק תא אחד מתוך ארבעה בריבוע הוא ee. כל ביצה היא הגרלה חדשה — אל תוותרו אחרי ביצה אחת!',
    ],
    takeawayHe: 'שני הורים זקופים יכולים להוליד גור שמוט: האלל הרצסיבי (הנסוג) e היה מוסתר אצל שניהם.',
  },
  {
    id: 'd2-hidden-carrier',
    num: 2,
    titleHe: 'הנשא הנסתר',
    introHe: 'אחד משלושת הפופים הזקופים הוא נשא סודי (Ee). הכפר מקבל רק נשא מוכח — עם גור שמוט כהוכחה. פיפ השמוט (ee) מאתמול כבר אצלכם.',
    genes: ['ears'],
    eggs: 10,
    hints: true,
    lens: true,
    autoDeduce: true,
    coldNest: false,
    island: 'ranch',
    roster: (rng) => {
      const g = rng.shuffle(['Ee', 'EE', 'EE']);
      return [
        { key: 'pip', name: 'פיפ', geno: 'ee', loc: 'belt' },
        { key: 'tofi', name: 'טופי', geno: g[0], loc: 'meadow' },
        { key: 'motzi', name: 'מוצי', geno: g[1], loc: 'meadow' },
        { key: 'shimshi', name: 'שמשי', geno: g[2], loc: 'meadow' },
      ];
    },
    orders: [{ id: 'carrier', titleHe: 'נשא מוכח (Ee)', req: { kind: 'carrier', gene: 'ears', wildOnly: true }, icon: { ears: 'upright' } }],
    hintsHe: [
      'הכלאת מבחן: הכליאו מועמד זקוף עם פיפ השמוט (ee).',
      'גור שמוט אחד מספיק כדי להוכיח שההורה הזקוף נשא. גורים זקופים בלבד — עוד לא הוכחה.',
    ],
    takeawayHe: 'הכלאת מבחן עם פרט רצסיבי (ee) חושפת נשא: גור רצסיבי אחד מוכיח שההורה הוא Ee.',
  },
  {
    id: 'd3-pure-line',
    num: 3,
    titleHe: 'קו טהור',
    introHe: 'ורוד (P) שולט על כחול (p). הכפר רוצה זוג ורודים טהורים (PP) — כאלה שגם הנכדים שלהם תמיד יהיו ורודים. את PP אי אפשר לראות — רק להשתכנע מהגורים.',
    genes: ['color'],
    eggs: 10,
    hints: true,
    lens: true,
    autoDeduce: true,
    coldNest: false,
    island: 'ranch',
    roster: (rng) => {
      const g = rng.shuffle(['Pp', 'PP', 'PP']);
      return [
        { key: 'varda', name: 'ורדה', geno: g[0], loc: 'meadow' },
        { key: 'sukaria', name: 'סוכריה', geno: g[1], loc: 'meadow' },
        { key: 'petel', name: 'פטל', geno: g[2], loc: 'meadow' },
        { key: 'kachli', name: 'כחלי', geno: 'pp', loc: 'meadow' },
      ];
    },
    orders: [{ id: 'pure-pink', titleHe: 'זוג ורודים טהורים (PP)', req: { kind: 'purePair', gene: 'color', pheno: 'pink' }, icon: { color: 'pink' } }],
    hintsHe: [
      'הכליאו כל ורוד עם כחלי הכחול (pp). גור כחול = ההורה הוורוד נשא (Pp).',
      'גורים ורודים בלבד לא מוכיחים PP. אבל אם הוורוד נשא, הסיכוי לקבל ממנו n גורים ורודים ברצף הוא רק ½, ¼, ⅛... — ככל שהרצף ארוך יותר, קשה יותר להאמין שהוא נשא.',
    ],
    takeawayHe: 'הומוזיגוט דומיננטי (PP) ונשא (Pp) נראים אותו דבר. רק הצאצאים חושפים את ההבדל.',
  },
  {
    id: 'd4-stripes-spots',
    num: 4,
    titleHe: 'פסים וגם נקודות',
    introHe: 'האללים לפסים (Fˢ) ולנקודות (Fᴰ) הם קודומיננטיים: כשיש את שניהם רואים את שניהם — כמו סוג דם AB.',
    genes: ['pattern'],
    eggs: 14,
    hints: true,
    lens: true,
    autoDeduce: true,
    coldNest: false,
    island: 'ranch',
    roster: () => [
      { key: 'zebra', name: 'זברה', geno: 'SS', loc: 'meadow', fact: 'SS', tagHe: 'טהור' },
      { key: 'nekudi', name: 'נקודי', geno: 'DD', loc: 'meadow', fact: 'DD', tagHe: 'טהור' },
    ],
    orders: [
      { id: 'both', titleHe: 'פופי עם פסים וגם נקודות', req: { kind: 'phenotype', pheno: { pattern: 'both' } }, icon: { pattern: 'both' } },
      {
        id: 'family',
        titleHe: 'תמונה משפחתית: אחים עם פסים, נקודות ושניהם — מאותם הורים',
        req: { kind: 'family', gene: 'pattern', phenos: ['stripes', 'both', 'spots'] },
        icon: { pattern: 'both' },
      },
    ],
    hintsHe: [
      'פסים × נקודות נותן רק "פסים וגם נקודות" (FˢFᴰ). זה לא ערבוב — שני הדפוסים מופיעים.',
      'לתמונה המשפחתית: הכליאו שני גורים FˢFᴰ זה עם זה. היחס הצפוי 1:2:1 — פסים : שניהם : נקודות.',
    ],
    takeawayHe: 'בקודומיננטיות שני האללים מתבטאים יחד (FˢFᴰ = פסים וגם נקודות), ולכן FˢFᴰ × FˢFᴰ נותן 1:2:1 בפנוטיפ — לא 3:1.',
  },
  {
    id: 'd5-two-traits',
    num: 5,
    titleHe: 'שתי תכונות',
    introHe: 'האוזניים והצבע הם שני גנים נפרדים: לכל אחד ריבוע פאנט משלו, וההסתברויות מוכפלות. ויש קן קר ❄️.',
    genes: ['ears', 'color'],
    eggs: 14,
    hints: true,
    lens: true,
    autoDeduce: true,
    coldNest: true,
    island: 'ranch',
    roster: () => [
      { key: 'agas', name: 'אגס', geno: 'Ee Pp', loc: 'belt', fact: 'Ee Pp', tagHe: 'מהחווה' },
      { key: 'yam', name: 'ים', geno: 'Ee pp', loc: 'belt', fact: 'Ee pp', tagHe: 'מהחווה' },
      { key: 'perach', name: 'פרח', geno: 'ee Pp', loc: 'belt', fact: 'ee Pp', tagHe: 'מהחווה' },
      { key: 'nasich', name: 'נסיך', geno: 'EE PP', loc: 'belt', fact: 'EE PP', tagHe: 'מהחווה', pretty: 3 },
    ],
    orders: [
      { id: 'floppy-blue', titleHe: 'שמוט וגם כחול', req: { kind: 'phenotype', pheno: { ears: 'floppy', color: 'blue' } }, icon: { ears: 'floppy', color: 'blue' } },
      { id: 'violet', titleHe: 'פופי סגול', req: { kind: 'phenotype', pheno: { color: 'violet' } }, icon: { color: 'violet' } },
      {
        id: 'violet-kid',
        titleHe: 'גור כחול להורה סגול',
        req: { kind: 'parentPheno', pheno: { color: 'blue' }, parentPheno: { color: 'violet' } },
        icon: { color: 'blue' },
      },
    ],
    hintsHe: [
      'שמוט וגם כחול: חפשו זוג שבו לכל תכונה יש סיכוי גבוה. ½ × ½ = ¼ עדיף על ¼ × ½ = ⅛.',
      'סגול = pp שגדל בקן הקר. הקור משנה את הפנוטיפ, לא את הגנוטיפ: סגול (pp) עם בן זוג pp בקן החם ייתן גורים כחולים.',
    ],
    takeawayHe: 'גנים נפרדים עוברים בנפרד (מכפילים הסתברויות), והסביבה משנה פנוטיפ בלי לשנות גנוטיפ.',
  },
  {
    id: 'd6-the-show',
    num: 6,
    titleHe: 'התערוכה',
    introHe: 'אי התערוכה: תכונות חדשות, בלי רמזים ובלי עדשת פאנט. בתערוכה מציגים רק גורים שבקעו כאן — קראו את לוח השושלת ומלאו שלוש הזמנות.',
    genes: ['tail', 'glow'],
    eggs: 10,
    hints: false,
    lens: false,
    autoDeduce: false,
    coldNest: false,
    island: 'show',
    roster: () => [
      { key: 'nitzotz', name: 'ניצוץ', geno: 'Cc Gg', loc: 'meadow', pretty: 3 },
      { key: 'shavit', name: 'שביט', geno: 'CC GG', loc: 'meadow', pretty: 3 },
      { key: 'tachav', name: 'טחב', geno: 'cc gg', loc: 'meadow', pretty: 1 },
      { key: 'chaluk', name: 'חלוק', geno: 'Cc gg', loc: 'meadow', pretty: 2 },
      // Pedigree parents (on the board only).
      { key: 'nitzotz-m', name: 'אמא של ניצוץ', geno: 'cc gg', loc: 'away', sex: 'f' },
      { key: 'nitzotz-f', name: 'אבא של ניצוץ', geno: 'CC GG', loc: 'away', sex: 'm' },
      { key: 'shavit-m', name: 'אמא של שביט', geno: 'Cc Gg', loc: 'away', sex: 'f' },
      { key: 'shavit-f', name: 'אבא של שביט', geno: 'CC Gg', loc: 'away', sex: 'm' },
      { key: 'chaluk-m', name: 'אמא של חלוק', geno: 'CC gg', loc: 'away', sex: 'f' },
      { key: 'chaluk-f', name: 'אבא של חלוק', geno: 'cc gg', loc: 'away', sex: 'm' },
    ],
    pedigree: {
      parents: {
        nitzotz: ['nitzotz-m', 'nitzotz-f'],
        shavit: ['shavit-m', 'shavit-f'],
        chaluk: ['chaluk-m', 'chaluk-f'],
      },
      noteHe: 'G (זוהר) שולט — אבל שולט לא אומר נפוץ: באי רוב הפופים בלי מחוש (gg). אלה כאן הגיעו לתערוכה בזכות המחוש.',
    },
    orders: [
      { id: 'straight', titleHe: 'זנב ישר', req: { kind: 'phenotype', pheno: { tail: 'straight' }, bredOnly: true }, icon: { tail: 'straight' } },
      { id: 'glow', titleHe: 'מחוש זוהר', req: { kind: 'phenotype', pheno: { glow: 'glow' }, bredOnly: true }, icon: { glow: 'glow' } },
      {
        id: 'glow-straight',
        titleHe: 'זוהר וגם זנב ישר',
        req: { kind: 'phenotype', pheno: { glow: 'glow', tail: 'straight' }, bredOnly: true },
        icon: { glow: 'glow', tail: 'straight' },
      },
    ],
    hintsHe: [],
    takeawayHe: 'מילאתם את התערוכה בלי רמזים ובלי עדשה. הזוג החכם: ניצוץ (Cc Gg, לפי אמו הישרה וחסרת המחוש) × טחב (cc gg) — כל ביצה: ½ ישר, ½ זוהר, ¼ שניהם.',
  },
];
