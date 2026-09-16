/**
 * Sample Spheres of Power casting traditions and Spheres of Might / Champion
 * martial traditions for the wizard's tradition pickers.
 *
 * A tradition is normally *built* (casters swap 2-3 drawbacks for bonus talents
 * and pick a boon; martial classes pick a package of bonus talents), so these
 * are the common published samples — a GM may adjust them. The wizard stores the
 * chosen name as a free-text choice value; a "Custom" entry keeps free text.
 */

export interface TraditionPreset {
  name: string;
  summary: string;
  /** What the tradition swaps in / grants, in brief. */
  grants: string;
}

export const CASTING_TRADITIONS: TraditionPreset[] = [
  {
    name: "Standard",
    summary: "The default tradition — no drawbacks, no boons.",
    grants: "No bonus talents, no boon.",
  },
  {
    name: "Educated (Wizardly)",
    summary:
      "Book-taught arcanists who study magic as a science; magic fails if they cannot reference their notes.",
    grants:
      "Drawbacks: Prepared Caster, Skilled Casting, Verbal Casting → 3 bonus talents.",
  },
  {
    name: "Inner Ki",
    summary:
      "Monastic casters who channel magic through breath and body rather than words or gestures.",
    grants:
      "Drawbacks: Somatic Casting, Focus Casting, Magical Signs → 3 bonus talents; boon: Ki Manipulation.",
  },
  {
    name: "Draconic Bloodline",
    summary:
      "Innate sorcery from draconic ancestry; power surges with emotion and heritage.",
    grants:
      "Drawbacks: Draining Casting, Overwhelming Power → 2 bonus talents; boon: draconic resistance.",
  },
  {
    name: "Witchcraft (Patron)",
    summary:
      "Power borrowed from a patron spirit, focused through a familiar or fetish.",
    grants:
      "Drawbacks: Bloodline/Patron, Ritualistic Casting, Material Casting → 3 bonus talents.",
  },
  {
    name: "Bokor Voodoo",
    summary:
      "Ritual death-magic worked through drumming, dance and offerings to the loa.",
    grants:
      "Drawbacks: Extended Casting, Prepared Caster, Verbal Casting → 3 bonus talents; boon: minor undead servant.",
  },
  {
    name: "Elemental Attunement",
    summary:
      "Casters bound to a single element; their magic always carries its mark.",
    grants:
      "Drawbacks: Energy Focus, Magical Signs → 2 bonus talents; boon: elemental resistance.",
  },
  {
    name: "Fey Pact",
    summary:
      "Glamour and illusion granted by a bargain with the fey; iron and rudeness disrupt it.",
    grants:
      "Drawbacks: Wild Magic, Material Casting, Painful Magic → 3 bonus talents; boon: fey step.",
  },
  {
    name: "Psychic Discipline",
    summary:
      "Mind-magic with no outward component — only concentration and force of will.",
    grants:
      "Drawbacks: Focus Casting, Emotional Casting, Draining Casting → 3 bonus talents.",
  },
  {
    name: "Armored Battlemage",
    summary:
      "Front-line casters trained to work magic in armor and under fire.",
    grants:
      "Drawbacks: Somatic Casting, Overwhelming Power → 2 bonus talents; boon: cast defensively bonus.",
  },
  {
    name: "Divine Channeler",
    summary:
      "Faith-granted magic; prayers and holy symbols are required, and the deity's ethos constrains use.",
    grants:
      "Drawbacks: Verbal Casting, Prepared Caster, Prohibited Spheres → 3 bonus talents.",
  },
  {
    name: "Wild Talent",
    summary:
      "Untrained, instinctive magic that sometimes lashes out unpredictably.",
    grants:
      "Drawbacks: Wild Magic, Magical Signs, Addictive Casting → 3 bonus talents.",
  },
];

export const MARTIAL_TRADITIONS: TraditionPreset[] = [
  {
    name: "Warleader",
    summary: "Battlefield commanders who bolster and direct allies.",
    grants: "Bonus talents from the Warleader and Tactics spheres.",
  },
  {
    name: "Duelist",
    summary: "Precise single-weapon fighters who read and punish an opponent.",
    grants: "Bonus talents from the Duelist and Fencing spheres.",
  },
  {
    name: "Sword and Board",
    summary: "Shield-and-blade soldiers trained to protect a line.",
    grants: "Bonus talents from the Shield and Guardian spheres.",
  },
  {
    name: "Guardian",
    summary: "Bodyguards who intercept blows meant for others.",
    grants: "Bonus talents from the Guardian and Barroom spheres.",
  },
  {
    name: "Sharpshooter",
    summary: "Ranged specialists focused on accuracy at distance.",
    grants: "Bonus talents from the Sniper and Barrage spheres.",
  },
  {
    name: "Brute",
    summary: "Overwhelming two-handed power and raw intimidation.",
    grants: "Bonus talents from the Berserker and Brute spheres.",
  },
  {
    name: "Mystic",
    summary: "Martial artists whose training brushes the supernatural.",
    grants: "Bonus talents from the Alchemy and Wrestling spheres.",
  },
  {
    name: "Scrapper",
    summary: "Dirty, adaptable brawlers who fight with whatever is at hand.",
    grants: "Bonus talents from the Boxing and Barroom spheres.",
  },
  {
    name: "Zweihander",
    summary: "Great-weapon drill: sweeping reach and momentum.",
    grants: "Bonus talents from the Lancer and Berserker spheres.",
  },
  {
    name: "Pack Hunter",
    summary: "Mounted or companion-supported skirmishers.",
    grants: "Bonus talents from the Beastmastery and Scout spheres.",
  },
  {
    name: "Skirmisher",
    summary: "Hit-and-run fighters who never hold still.",
    grants: "Bonus talents from the Athletics and Scout spheres.",
  },
  {
    name: "Blacksmith",
    summary: "Armored, equipment-focused warriors who maintain their own gear.",
    grants: "Bonus talents from the Equipment and Smithing spheres.",
  },
];
