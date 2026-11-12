/**
 * FM24 role/duty catalogue and source metric metadata.
 *
 * Adapted from Recruitment Lab (MIT License), branch recruitment-lab/custom-build.
 * Copyright (c) 2026 Recruitment Lab contributors.
 * The original licence notice is retained in docs/SCORING_METHODOLOGY.md.
 *
 * These are 115 selectable role/duty variants, not 115 distinct role names.
 * Role weights and metadata are the V1 baseline; do not edit without a versioned
 * methodology change and regression tests.
 */
export const FM24_ROLES = [
  {
    "id": "gk-GK-D",
    "type": "gk",
    "name": "Goalkeeper",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "GK",
    "slots": [
      "GK"
    ],
    "tpl": "gk",
    "desc": "A traditional keeper whose job is stopping shots and claiming crosses.",
    "w": {
      "xGP/90": 3,
      "Save %": 2,
      "Catch rate": 1,
      "CS/Start": 1,
      "Errors/90": 1.3
    },
    "x": "Save %",
    "y": "xGP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "sk-GK-D",
    "type": "sk",
    "name": "Sweeper Keeper",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "GK",
    "slots": [
      "GK"
    ],
    "tpl": "gk",
    "desc": "Comes off his line to sweep behind a high defence and starts attacks with his feet.",
    "w": {
      "xGP/90": 3,
      "Pas %": 1.65,
      "Ps A/90": 1.1,
      "Pr passes/90": 0.85,
      "Int/90": 1.95,
      "Poss Won/90": 1.3,
      "Errors/90": 1.3
    },
    "x": "Pas %",
    "y": "xGP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "sk"
  },
  {
    "id": "sk-GK-S",
    "type": "sk",
    "name": "Sweeper Keeper",
    "duty": "S",
    "dutyName": "Support",
    "strata": "GK",
    "slots": [
      "GK"
    ],
    "tpl": "gk",
    "desc": "Comes off his line to sweep behind a high defence and starts attacks with his feet.",
    "w": {
      "xGP/90": 3,
      "Pas %": 1.5,
      "Ps A/90": 1,
      "Pr passes/90": 1,
      "Int/90": 1.5,
      "Poss Won/90": 1,
      "Errors/90": 1
    },
    "x": "Pas %",
    "y": "xGP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "sk"
  },
  {
    "id": "sk-GK-A",
    "type": "sk",
    "name": "Sweeper Keeper",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "GK",
    "slots": [
      "GK"
    ],
    "tpl": "gk",
    "desc": "Comes off his line to sweep behind a high defence and starts attacks with his feet.",
    "w": {
      "xGP/90": 3,
      "Pas %": 1.275,
      "Ps A/90": 0.85,
      "Pr passes/90": 1.1,
      "Int/90": 0.975,
      "Poss Won/90": 0.65,
      "Errors/90": 0.65
    },
    "x": "Pas %",
    "y": "xGP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "sk"
  },
  {
    "id": "cd-DC-D",
    "type": "cd",
    "name": "Central Defender",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "The core defensive role: wins headers, wins tackles, clears danger.",
    "w": {
      "Hdr %": 2.3,
      "Hdrs W/90": 1.725,
      "Tck R": 2.6,
      "TklW+Int/90": 1.95,
      "Box def/90": 1.3,
      "K Tck/90": 1.3,
      "Errors/90": 1.3
    },
    "x": "Hdr %",
    "y": "Tck R",
    "xdir": 1,
    "ydir": 1,
    "guide": "cd"
  },
  {
    "id": "cd-DC-St",
    "type": "cd",
    "name": "Central Defender",
    "duty": "St",
    "dutyName": "Stopper",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "The core defensive role: wins headers, wins tackles, clears danger.",
    "w": {
      "Hdr %": 2.2,
      "Hdrs W/90": 1.65,
      "Tck R": 2.7,
      "TklW+Int/90": 2.025,
      "Box def/90": 0.8,
      "K Tck/90": 1.35,
      "Errors/90": 1.35
    },
    "x": "Hdr %",
    "y": "Tck R",
    "xdir": 1,
    "ydir": 1,
    "guide": "cd"
  },
  {
    "id": "cd-DC-C",
    "type": "cd",
    "name": "Central Defender",
    "duty": "C",
    "dutyName": "Cover",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "The core defensive role: wins headers, wins tackles, clears danger.",
    "w": {
      "Hdr %": 2,
      "Hdrs W/90": 1.5,
      "Tck R": 2,
      "TklW+Int/90": 1.5,
      "Box def/90": 1.45,
      "K Tck/90": 1,
      "Errors/90": 1
    },
    "x": "Hdr %",
    "y": "Tck R",
    "xdir": 1,
    "ydir": 1,
    "guide": "cd"
  },
  {
    "id": "bpd-DC-D",
    "type": "bpd",
    "name": "Ball-Playing Defender",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "Defends first, then breaks lines with his passing from the back.",
    "w": {
      "Pr passes/90": 2.125,
      "Pas %": 1.65,
      "Verticality": 0.85,
      "Poss Won/90": 1.95,
      "Hdr %": 1.725,
      "Tck R": 1.95,
      "Loss rate": 1.1
    },
    "x": "Pr passes/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "bpd"
  },
  {
    "id": "bpd-DC-St",
    "type": "bpd",
    "name": "Ball-Playing Defender",
    "duty": "St",
    "dutyName": "Stopper",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "Defends first, then breaks lines with his passing from the back.",
    "w": {
      "Pr passes/90": 2.25,
      "Pas %": 1.35,
      "Verticality": 0.9,
      "Poss Won/90": 2.025,
      "Hdr %": 1.65,
      "Tck R": 2.025,
      "Loss rate": 0.9
    },
    "x": "Pr passes/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "bpd"
  },
  {
    "id": "bpd-DC-C",
    "type": "bpd",
    "name": "Ball-Playing Defender",
    "duty": "C",
    "dutyName": "Cover",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "Defends first, then breaks lines with his passing from the back.",
    "w": {
      "Pr passes/90": 2.5,
      "Pas %": 1.5,
      "Verticality": 1,
      "Poss Won/90": 1.5,
      "Hdr %": 1.5,
      "Tck R": 1.5,
      "Loss rate": 1
    },
    "x": "Pr passes/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "bpd"
  },
  {
    "id": "nncb-DC-D",
    "type": "nncb",
    "name": "No-Nonsense Centre-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "Wins it and clears it, with no risk taken on the ball.",
    "w": {
      "Hdr %": 2.3,
      "Hdrs W/90": 2.3,
      "Box def/90": 2.6,
      "Clr/90": 1.95,
      "Tck R": 1.95,
      "K Hdrs/90": 1.15,
      "Errors/90": 1.3
    },
    "x": "Hdrs W/90",
    "y": "Box def/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "nncb-DC-St",
    "type": "nncb",
    "name": "No-Nonsense Centre-Back",
    "duty": "St",
    "dutyName": "Stopper",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "Wins it and clears it, with no risk taken on the ball.",
    "w": {
      "Hdr %": 2.2,
      "Hdrs W/90": 2.2,
      "Box def/90": 1.6,
      "Clr/90": 1.2,
      "Tck R": 2.025,
      "K Hdrs/90": 1.1,
      "Errors/90": 1.35
    },
    "x": "Hdrs W/90",
    "y": "Box def/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "nncb-DC-C",
    "type": "nncb",
    "name": "No-Nonsense Centre-Back",
    "duty": "C",
    "dutyName": "Cover",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "Wins it and clears it, with no risk taken on the ball.",
    "w": {
      "Hdr %": 2,
      "Hdrs W/90": 2,
      "Box def/90": 2.9,
      "Clr/90": 2.175,
      "Tck R": 1.5,
      "K Hdrs/90": 1,
      "Errors/90": 1
    },
    "x": "Hdrs W/90",
    "y": "Box def/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wcb-DC-D",
    "type": "wcb",
    "name": "Wide Centre-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "A centre-back in a back three who covers the channel and, on higher duties, overlaps and carries.",
    "w": {
      "Drb/90": 1.7,
      "Pr passes/90": 1.7,
      "OP-Crs C/90": 0.7,
      "Tck R": 1.95,
      "Sprints/90": 1.5,
      "Hdr %": 1.15
    },
    "x": "Tck R",
    "y": "Sprints/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wcb-d"
  },
  {
    "id": "wcb-DC-S",
    "type": "wcb",
    "name": "Wide Centre-Back",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "A centre-back in a back three who covers the channel and, on higher duties, overlaps and carries.",
    "w": {
      "Drb/90": 2,
      "Pr passes/90": 2,
      "OP-Crs C/90": 1,
      "Tck R": 1.5,
      "Sprints/90": 1.5,
      "Hdr %": 1
    },
    "x": "Drb/90",
    "y": "Pr passes/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wcb-s"
  },
  {
    "id": "wcb-DC-A",
    "type": "wcb",
    "name": "Wide Centre-Back",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "A centre-back in a back three who covers the channel and, on higher duties, overlaps and carries.",
    "w": {
      "Drb/90": 2.2,
      "Pr passes/90": 2.2,
      "OP-Crs C/90": 1.15,
      "Tck R": 0.975,
      "Sprints/90": 1.575,
      "Hdr %": 0.9
    },
    "x": "Drb/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wcb-a"
  },
  {
    "id": "libero-DC-S",
    "type": "libero",
    "name": "Libero",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "Steps out of the back line into midfield in possession and dictates from deep.",
    "w": {
      "Pr passes/90": 2.5,
      "Ps A/90": 2,
      "Pas %": 1,
      "Drb/90": 1,
      "Int/90": 1.5,
      "Tck R": 1,
      "Hdr %": 1
    },
    "x": "Pr passes/90",
    "y": "Ps A/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "libero"
  },
  {
    "id": "libero-DC-A",
    "type": "libero",
    "name": "Libero",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "DC",
    "slots": [
      "D-C"
    ],
    "tpl": "cb",
    "desc": "Steps out of the back line into midfield in possession and dictates from deep.",
    "w": {
      "Pr passes/90": 2.75,
      "Ps A/90": 1.7,
      "Pas %": 0.85,
      "Drb/90": 1.1,
      "Int/90": 0.975,
      "Tck R": 0.65,
      "Hdr %": 0.9
    },
    "x": "Pr passes/90",
    "y": "Ps A/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "libero"
  },
  {
    "id": "fb-DLR-D",
    "type": "fb",
    "name": "Full-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Defends his flank first and adds width when the team needs it.",
    "w": {
      "Tck R": 2.6,
      "TklW+Int/90": 2.6,
      "Hdr %": 1.15,
      "OP-Crs C/90": 1.05,
      "Pas %": 1.1,
      "Pr passes/90": 0.85,
      "Sprints/90": 1
    },
    "x": "TklW+Int/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "fb-DLR-S",
    "type": "fb",
    "name": "Full-Back",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Defends his flank first and adds width when the team needs it.",
    "w": {
      "Tck R": 2,
      "TklW+Int/90": 2,
      "Hdr %": 1,
      "OP-Crs C/90": 1.5,
      "Pas %": 1,
      "Pr passes/90": 1,
      "Sprints/90": 1
    },
    "x": "TklW+Int/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "fb-DLR-A",
    "type": "fb",
    "name": "Full-Back",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Defends his flank first and adds width when the team needs it.",
    "w": {
      "Tck R": 1.3,
      "TklW+Int/90": 1.3,
      "Hdr %": 0.9,
      "OP-Crs C/90": 1.725,
      "Pas %": 0.85,
      "Pr passes/90": 1.1,
      "Sprints/90": 1.05
    },
    "x": "TklW+Int/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "fb-DLR-Au",
    "type": "fb",
    "name": "Full-Back",
    "duty": "Au",
    "dutyName": "Automatic",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Defends his flank first and adds width when the team needs it.",
    "w": {
      "Tck R": 1.966,
      "TklW+Int/90": 1.966,
      "Hdr %": 1.017,
      "OP-Crs C/90": 1.425,
      "Pas %": 0.983,
      "Pr passes/90": 0.983,
      "Sprints/90": 1.017
    },
    "x": "TklW+Int/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "nnfb-DLR-D",
    "type": "nnfb",
    "name": "No-Nonsense Full-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "A defensive full-back who stays home and takes no risks.",
    "w": {
      "Tck R": 3.25,
      "TklW+Int/90": 2.6,
      "Box def/90": 1.95,
      "Hdr %": 1.725,
      "Errors/90": 1.3
    },
    "x": "Tck R",
    "y": "TklW+Int/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wb-DLR-D",
    "type": "wb",
    "name": "Wing-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Owns the whole flank: delivery going forward and a defensive return.",
    "w": {
      "OP-Crs C/90": 1.4,
      "Poss Won/90": 2.6,
      "xA/90": 1.05,
      "Drb/90": 0.85,
      "Sprints/90": 1.5,
      "Tck R": 1.3
    },
    "x": "OP-Crs C/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wb"
  },
  {
    "id": "wb-DLR-S",
    "type": "wb",
    "name": "Wing-Back",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Owns the whole flank: delivery going forward and a defensive return.",
    "w": {
      "OP-Crs C/90": 2,
      "Poss Won/90": 2,
      "xA/90": 1.5,
      "Drb/90": 1,
      "Sprints/90": 1.5,
      "Tck R": 1
    },
    "x": "OP-Crs C/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wb"
  },
  {
    "id": "wb-DLR-A",
    "type": "wb",
    "name": "Wing-Back",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Owns the whole flank: delivery going forward and a defensive return.",
    "w": {
      "OP-Crs C/90": 2.3,
      "Poss Won/90": 1.3,
      "xA/90": 1.725,
      "Drb/90": 1.1,
      "Sprints/90": 1.575,
      "Tck R": 0.65
    },
    "x": "OP-Crs C/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wb"
  },
  {
    "id": "wb-DLR-Au",
    "type": "wb",
    "name": "Wing-Back",
    "duty": "Au",
    "dutyName": "Automatic",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Owns the whole flank: delivery going forward and a defensive return.",
    "w": {
      "OP-Crs C/90": 1.9,
      "Poss Won/90": 1.966,
      "xA/90": 1.425,
      "Drb/90": 0.983,
      "Sprints/90": 1.525,
      "Tck R": 0.983
    },
    "x": "OP-Crs C/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wb"
  },
  {
    "id": "cwb-DLR-S",
    "type": "cwb",
    "name": "Complete Wing-Back",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "The most attacking wide defender, effectively a winger with defensive duties.",
    "w": {
      "xA/90": 2.5,
      "Drb/90": 2,
      "OP-Crs C/90": 1.5,
      "OP-KP/90": 1,
      "Sprints/90": 1.5,
      "Tck R": 0.75
    },
    "x": "xA/90",
    "y": "Sprints/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "cwb"
  },
  {
    "id": "cwb-DLR-A",
    "type": "cwb",
    "name": "Complete Wing-Back",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "The most attacking wide defender, effectively a winger with defensive duties.",
    "w": {
      "xA/90": 2.875,
      "Drb/90": 2.2,
      "OP-Crs C/90": 1.725,
      "OP-KP/90": 1.15,
      "Sprints/90": 1.575,
      "Tck R": 0.488
    },
    "x": "xA/90",
    "y": "Sprints/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "cwb"
  },
  {
    "id": "iwb-DLR-D",
    "type": "iwb",
    "name": "Inverted Wing-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Moves inside into midfield in possession and plays as an extra playmaker.",
    "w": {
      "Pr passes/90": 2.125,
      "OP-KP/90": 1.4,
      "Ps A/90": 1.65,
      "Pas %": 1.1,
      "Pres A/90": 1,
      "Tck R": 1.3
    },
    "x": "Pr passes/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iwb"
  },
  {
    "id": "iwb-DLR-S",
    "type": "iwb",
    "name": "Inverted Wing-Back",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Moves inside into midfield in possession and plays as an extra playmaker.",
    "w": {
      "Pr passes/90": 2.5,
      "OP-KP/90": 2,
      "Ps A/90": 1.5,
      "Pas %": 1,
      "Pres A/90": 1,
      "Tck R": 1
    },
    "x": "Pr passes/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iwb"
  },
  {
    "id": "iwb-DLR-A",
    "type": "iwb",
    "name": "Inverted Wing-Back",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Moves inside into midfield in possession and plays as an extra playmaker.",
    "w": {
      "Pr passes/90": 2.75,
      "OP-KP/90": 2.3,
      "Ps A/90": 1.275,
      "Pas %": 0.85,
      "Pres A/90": 0.9,
      "Tck R": 0.65
    },
    "x": "Pr passes/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iwb"
  },
  {
    "id": "iwb-DLR-Au",
    "type": "iwb",
    "name": "Inverted Wing-Back",
    "duty": "Au",
    "dutyName": "Automatic",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Moves inside into midfield in possession and plays as an extra playmaker.",
    "w": {
      "Pr passes/90": 2.458,
      "OP-KP/90": 1.9,
      "Ps A/90": 1.474,
      "Pas %": 0.983,
      "Pres A/90": 0.967,
      "Tck R": 0.983
    },
    "x": "Pr passes/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iwb"
  },
  {
    "id": "ifb-DLR-D",
    "type": "ifb",
    "name": "Inverted Full-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DLR",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb",
    "desc": "Tucks in to form a back three in possession, defending like a centre-back.",
    "w": {
      "Int/90": 2.6,
      "Pr passes/90": 1.7,
      "Tck R": 1.95,
      "Hdr %": 1.725,
      "Pas %": 1.1,
      "Aer A/90": 0.575
    },
    "x": "Int/90",
    "y": "Pr passes/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "ifb"
  },
  {
    "id": "wb-WB-D",
    "type": "wb",
    "name": "Wing-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "Owns the whole flank: delivery going forward and a defensive return.",
    "w": {
      "OP-Crs C/90": 1.4,
      "Poss Won/90": 2.6,
      "xA/90": 1.05,
      "Drb/90": 0.85,
      "Sprints/90": 1.5,
      "Tck R": 1.3
    },
    "x": "OP-Crs C/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wb"
  },
  {
    "id": "wb-WB-S",
    "type": "wb",
    "name": "Wing-Back",
    "duty": "S",
    "dutyName": "Support",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "Owns the whole flank: delivery going forward and a defensive return.",
    "w": {
      "OP-Crs C/90": 2,
      "Poss Won/90": 2,
      "xA/90": 1.5,
      "Drb/90": 1,
      "Sprints/90": 1.5,
      "Tck R": 1
    },
    "x": "OP-Crs C/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wb"
  },
  {
    "id": "wb-WB-A",
    "type": "wb",
    "name": "Wing-Back",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "Owns the whole flank: delivery going forward and a defensive return.",
    "w": {
      "OP-Crs C/90": 2.3,
      "Poss Won/90": 1.3,
      "xA/90": 1.725,
      "Drb/90": 1.1,
      "Sprints/90": 1.575,
      "Tck R": 0.65
    },
    "x": "OP-Crs C/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wb"
  },
  {
    "id": "wb-WB-Au",
    "type": "wb",
    "name": "Wing-Back",
    "duty": "Au",
    "dutyName": "Automatic",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "Owns the whole flank: delivery going forward and a defensive return.",
    "w": {
      "OP-Crs C/90": 1.9,
      "Poss Won/90": 1.966,
      "xA/90": 1.425,
      "Drb/90": 0.983,
      "Sprints/90": 1.525,
      "Tck R": 0.983
    },
    "x": "OP-Crs C/90",
    "y": "Poss Won/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "wb"
  },
  {
    "id": "cwb-WB-S",
    "type": "cwb",
    "name": "Complete Wing-Back",
    "duty": "S",
    "dutyName": "Support",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "The most attacking wide defender, effectively a winger with defensive duties.",
    "w": {
      "xA/90": 2.5,
      "Drb/90": 2,
      "OP-Crs C/90": 1.5,
      "OP-KP/90": 1,
      "Sprints/90": 1.5,
      "Tck R": 0.75
    },
    "x": "xA/90",
    "y": "Sprints/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "cwb"
  },
  {
    "id": "cwb-WB-A",
    "type": "cwb",
    "name": "Complete Wing-Back",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "The most attacking wide defender, effectively a winger with defensive duties.",
    "w": {
      "xA/90": 2.875,
      "Drb/90": 2.2,
      "OP-Crs C/90": 1.725,
      "OP-KP/90": 1.15,
      "Sprints/90": 1.575,
      "Tck R": 0.488
    },
    "x": "xA/90",
    "y": "Sprints/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "cwb"
  },
  {
    "id": "iwb-WB-D",
    "type": "iwb",
    "name": "Inverted Wing-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "Moves inside into midfield in possession and plays as an extra playmaker.",
    "w": {
      "Pr passes/90": 2.125,
      "OP-KP/90": 1.4,
      "Ps A/90": 1.65,
      "Pas %": 1.1,
      "Pres A/90": 1,
      "Tck R": 1.3
    },
    "x": "Pr passes/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iwb"
  },
  {
    "id": "iwb-WB-S",
    "type": "iwb",
    "name": "Inverted Wing-Back",
    "duty": "S",
    "dutyName": "Support",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "Moves inside into midfield in possession and plays as an extra playmaker.",
    "w": {
      "Pr passes/90": 2.5,
      "OP-KP/90": 2,
      "Ps A/90": 1.5,
      "Pas %": 1,
      "Pres A/90": 1,
      "Tck R": 1
    },
    "x": "Pr passes/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iwb"
  },
  {
    "id": "iwb-WB-A",
    "type": "iwb",
    "name": "Inverted Wing-Back",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "Moves inside into midfield in possession and plays as an extra playmaker.",
    "w": {
      "Pr passes/90": 2.75,
      "OP-KP/90": 2.3,
      "Ps A/90": 1.275,
      "Pas %": 0.85,
      "Pres A/90": 0.9,
      "Tck R": 0.65
    },
    "x": "Pr passes/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iwb"
  },
  {
    "id": "iwb-WB-Au",
    "type": "iwb",
    "name": "Inverted Wing-Back",
    "duty": "Au",
    "dutyName": "Automatic",
    "strata": "WB",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb",
    "desc": "Moves inside into midfield in possession and plays as an extra playmaker.",
    "w": {
      "Pr passes/90": 2.458,
      "OP-KP/90": 1.9,
      "Ps A/90": 1.474,
      "Pas %": 0.983,
      "Pres A/90": 0.967,
      "Tck R": 0.983
    },
    "x": "Pr passes/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iwb"
  },
  {
    "id": "dm-DM-D",
    "type": "dm",
    "name": "Defensive Midfielder",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Screens the back line, wins the ball and recycles it.",
    "w": {
      "Poss Won/90": 2.6,
      "Int/90": 2.6,
      "Tck R": 1.95,
      "Pas %": 1.65,
      "Ps A/90": 1.1,
      "Hdr %": 1.15
    },
    "x": "Poss Won/90",
    "y": "Tck R",
    "xdir": 1,
    "ydir": 1,
    "guide": "dm-d"
  },
  {
    "id": "dm-DM-S",
    "type": "dm",
    "name": "Defensive Midfielder",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Screens the back line, wins the ball and recycles it.",
    "w": {
      "Poss Won/90": 2,
      "Int/90": 2,
      "Tck R": 1.5,
      "Pas %": 1.5,
      "Ps A/90": 1,
      "Hdr %": 1
    },
    "x": "Poss Won/90",
    "y": "Tck R",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "dlp-DM-D",
    "type": "dlp",
    "name": "Deep-Lying Playmaker",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Sets the tempo from deep and starts attacks with his passing.",
    "w": {
      "Ps C/90": 2.75,
      "Pr passes/90": 2.125,
      "Pas %": 1.65,
      "Int/90": 1.3,
      "xA/90": 0.7,
      "Loss rate": 1.1
    },
    "x": "Ps C/90",
    "y": "Int/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "dlp-d"
  },
  {
    "id": "dlp-DM-S",
    "type": "dlp",
    "name": "Deep-Lying Playmaker",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Sets the tempo from deep and starts attacks with his passing.",
    "w": {
      "Ps C/90": 2.5,
      "Pr passes/90": 2.5,
      "Pas %": 1.5,
      "Int/90": 1,
      "xA/90": 1,
      "Loss rate": 1
    },
    "x": "Ps C/90",
    "y": "Pr passes/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "dlp-s"
  },
  {
    "id": "anchor-DM-D",
    "type": "anchor",
    "name": "Anchor",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Sits in front of the defence, intercepts and gives it simply. Lower losses are better.",
    "w": {
      "Int/90": 3.25,
      "Loss rate": 2.2,
      "Pas %": 1.65,
      "Tck R": 1.95,
      "Hdr %": 1.15,
      "Box def/90": 1.3
    },
    "x": "Int/90",
    "y": "Poss Lost/90",
    "xdir": 1,
    "ydir": -1,
    "guide": "anchor"
  },
  {
    "id": "bwm-DM-D",
    "type": "bwm",
    "name": "Ball-Winning Midfielder",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Hunts the ball, presses and tackles, then gives it to a better passer.",
    "w": {
      "Tck W/90": 3.25,
      "Poss Won/90": 2.6,
      "Pres C/90": 2,
      "Press success": 1,
      "Tck R": 1.3,
      "Fls/Tck": 1.3
    },
    "x": "Poss Won/90",
    "y": "Pres C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "bwm-DM-S",
    "type": "bwm",
    "name": "Ball-Winning Midfielder",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Hunts the ball, presses and tackles, then gives it to a better passer.",
    "w": {
      "Tck W/90": 2.5,
      "Poss Won/90": 2,
      "Pres C/90": 2,
      "Press success": 1,
      "Tck R": 1,
      "Fls/Tck": 1
    },
    "x": "Poss Won/90",
    "y": "Pres C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "hb-DM-D",
    "type": "hb",
    "name": "Half-Back",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Drops between the centre-backs to build play, then screens in front of them.",
    "w": {
      "Int/90": 2.6,
      "Ps A/90": 2.2,
      "Pas %": 1.65,
      "Hdr %": 1.725,
      "Box def/90": 1.3,
      "Pr passes/90": 0.85
    },
    "x": "Ps A/90",
    "y": "Int/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "regista-DM-S",
    "type": "regista",
    "name": "Regista",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "A deep playmaker with freedom to roam and take risks.",
    "w": {
      "Pr passes/90": 2.5,
      "xA/90": 2,
      "Ps A/90": 2,
      "OP-KP/90": 1,
      "Pas %": 1,
      "Verticality": 1
    },
    "x": "Pr passes/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "regista"
  },
  {
    "id": "rpm-DM-S",
    "type": "rpm",
    "name": "Roaming Playmaker",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Picks the ball up deep and drives it forward by pass and carry.",
    "w": {
      "Prog/90": 2.5,
      "Ps A/90": 2,
      "OP-KP/90": 1.5,
      "Drb/90": 1.5,
      "Sprints/90": 1,
      "Pres A/90": 1
    },
    "x": "Prog/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "sv-DM-S",
    "type": "sv",
    "name": "Segundo Volante",
    "duty": "S",
    "dutyName": "Support",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Defends from deep and arrives late in the box.",
    "w": {
      "npxG/90": 2.5,
      "Poss Won/90": 2,
      "Shot/90": 1,
      "ShT/90": 1,
      "Sprints/90": 1,
      "Tck R": 1
    },
    "x": "Poss Won/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "sv-DM-A",
    "type": "sv",
    "name": "Segundo Volante",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "DM",
    "slots": [
      "DM"
    ],
    "tpl": "mid",
    "desc": "Defends from deep and arrives late in the box.",
    "w": {
      "npxG/90": 3.375,
      "Poss Won/90": 1.3,
      "Shot/90": 1.35,
      "ShT/90": 1.35,
      "Sprints/90": 1.05,
      "Tck R": 0.65
    },
    "x": "Poss Won/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "dlp-MC-D",
    "type": "dlp",
    "name": "Deep-Lying Playmaker",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Sets the tempo from deep and starts attacks with his passing.",
    "w": {
      "Ps C/90": 2.75,
      "Pr passes/90": 2.125,
      "Pas %": 1.65,
      "Int/90": 1.3,
      "xA/90": 0.7,
      "Loss rate": 1.1
    },
    "x": "Ps C/90",
    "y": "Int/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "dlp-d"
  },
  {
    "id": "dlp-MC-S",
    "type": "dlp",
    "name": "Deep-Lying Playmaker",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Sets the tempo from deep and starts attacks with his passing.",
    "w": {
      "Ps C/90": 2.5,
      "Pr passes/90": 2.5,
      "Pas %": 1.5,
      "Int/90": 1,
      "xA/90": 1,
      "Loss rate": 1
    },
    "x": "Ps C/90",
    "y": "Pr passes/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "dlp-s"
  },
  {
    "id": "bwm-MC-D",
    "type": "bwm",
    "name": "Ball-Winning Midfielder",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Hunts the ball, presses and tackles, then gives it to a better passer.",
    "w": {
      "Tck W/90": 3.25,
      "Poss Won/90": 2.6,
      "Pres C/90": 2,
      "Press success": 1,
      "Tck R": 1.3,
      "Fls/Tck": 1.3
    },
    "x": "Poss Won/90",
    "y": "Pres C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "bwm-MC-S",
    "type": "bwm",
    "name": "Ball-Winning Midfielder",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Hunts the ball, presses and tackles, then gives it to a better passer.",
    "w": {
      "Tck W/90": 2.5,
      "Poss Won/90": 2,
      "Pres C/90": 2,
      "Press success": 1,
      "Tck R": 1,
      "Fls/Tck": 1
    },
    "x": "Poss Won/90",
    "y": "Pres C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "rpm-MC-S",
    "type": "rpm",
    "name": "Roaming Playmaker",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Picks the ball up deep and drives it forward by pass and carry.",
    "w": {
      "Prog/90": 2.5,
      "Ps A/90": 2,
      "OP-KP/90": 1.5,
      "Drb/90": 1.5,
      "Sprints/90": 1,
      "Pres A/90": 1
    },
    "x": "Prog/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "cm-MC-D",
    "type": "cm",
    "name": "Central Midfielder",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "The balanced midfielder: presses, connects and moves it on.",
    "w": {
      "Pres A/90": 1.5,
      "Ps C/90": 1.65,
      "Pr passes/90": 1.275,
      "Poss Won/90": 1.95,
      "Pas %": 1.1,
      "OP-KP/90": 0.7,
      "Sprints/90": 1
    },
    "x": "Pres A/90",
    "y": "Ps C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "cm-MC-S",
    "type": "cm",
    "name": "Central Midfielder",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "The balanced midfielder: presses, connects and moves it on.",
    "w": {
      "Pres A/90": 1.5,
      "Ps C/90": 1.5,
      "Pr passes/90": 1.5,
      "Poss Won/90": 1.5,
      "Pas %": 1,
      "OP-KP/90": 1,
      "Sprints/90": 1
    },
    "x": "Pres A/90",
    "y": "Ps C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "cm-s"
  },
  {
    "id": "cm-MC-A",
    "type": "cm",
    "name": "Central Midfielder",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "The balanced midfielder: presses, connects and moves it on.",
    "w": {
      "Pres A/90": 1.35,
      "Ps C/90": 1.275,
      "Pr passes/90": 1.65,
      "Poss Won/90": 0.975,
      "Pas %": 0.85,
      "OP-KP/90": 1.15,
      "Sprints/90": 1.05
    },
    "x": "Pres A/90",
    "y": "Ps C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "cm-MC-Au",
    "type": "cm",
    "name": "Central Midfielder",
    "duty": "Au",
    "dutyName": "Automatic",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "The balanced midfielder: presses, connects and moves it on.",
    "w": {
      "Pres A/90": 1.45,
      "Ps C/90": 1.474,
      "Pr passes/90": 1.474,
      "Poss Won/90": 1.474,
      "Pas %": 0.983,
      "OP-KP/90": 0.95,
      "Sprints/90": 1.017
    },
    "x": "Pres A/90",
    "y": "Ps C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "b2b-MC-S",
    "type": "b2b",
    "name": "Box-to-Box Midfielder",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Covers both boxes, winning it in his own half and arriving in theirs.",
    "w": {
      "Poss Won/90": 2,
      "npxG/90": 2,
      "Sprints/90": 1.5,
      "Prog/90": 1.5,
      "Pres A/90": 1,
      "ShT/90": 1
    },
    "x": "Poss Won/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "bbm"
  },
  {
    "id": "ap-MC-S",
    "type": "ap",
    "name": "Advanced Playmaker",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Finds space between the lines and makes the final pass.",
    "w": {
      "OP-KP/90": 2.5,
      "xA/90": 2.5,
      "Drb/90": 1.5,
      "Pas %": 1,
      "Pr passes/90": 1,
      "CCC/90": 1
    },
    "x": "OP-KP/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "ap"
  },
  {
    "id": "ap-MC-A",
    "type": "ap",
    "name": "Advanced Playmaker",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Finds space between the lines and makes the final pass.",
    "w": {
      "OP-KP/90": 2.875,
      "xA/90": 2.875,
      "Drb/90": 1.65,
      "Pas %": 0.85,
      "Pr passes/90": 1.1,
      "CCC/90": 1.15
    },
    "x": "OP-KP/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "ap"
  },
  {
    "id": "mez-MC-S",
    "type": "mez",
    "name": "Mezzala",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Drifts into the half-space to create and arrive in the box.",
    "w": {
      "xA/90": 2,
      "npxG/90": 2,
      "Drb/90": 1.5,
      "Prog/90": 1.5,
      "Sprints/90": 1,
      "OP-KP/90": 1
    },
    "x": "xA/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "mez-MC-A",
    "type": "mez",
    "name": "Mezzala",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Drifts into the half-space to create and arrive in the box.",
    "w": {
      "xA/90": 2.3,
      "npxG/90": 2.7,
      "Drb/90": 1.65,
      "Prog/90": 1.65,
      "Sprints/90": 1.05,
      "OP-KP/90": 1.15
    },
    "x": "xA/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "mez-a"
  },
  {
    "id": "carr-MC-S",
    "type": "carr",
    "name": "Carrilero",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MC",
    "slots": [
      "M-C"
    ],
    "tpl": "mid",
    "desc": "Shuttles across the midfield, covering wide areas and keeping it simple.",
    "w": {
      "Ps C/90": 2,
      "Pas %": 2,
      "Pres A/90": 1.5,
      "Poss Won/90": 1.5,
      "Sprints/90": 1.5,
      "Loss rate": 1
    },
    "x": "Ps C/90",
    "y": "Pres A/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wm-MLR-D",
    "type": "wm",
    "name": "Wide Midfielder",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "The two-way wide player of a flat midfield.",
    "w": {
      "OP-Crs C/90": 1.4,
      "Poss Won/90": 1.95,
      "Pres A/90": 1.5,
      "xA/90": 1.05,
      "Sprints/90": 1.5,
      "Pas %": 1.1
    },
    "x": "OP-Crs C/90",
    "y": "Pres A/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wm-MLR-S",
    "type": "wm",
    "name": "Wide Midfielder",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "The two-way wide player of a flat midfield.",
    "w": {
      "OP-Crs C/90": 2,
      "Poss Won/90": 1.5,
      "Pres A/90": 1.5,
      "xA/90": 1.5,
      "Sprints/90": 1.5,
      "Pas %": 1
    },
    "x": "OP-Crs C/90",
    "y": "Pres A/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wm-MLR-A",
    "type": "wm",
    "name": "Wide Midfielder",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "The two-way wide player of a flat midfield.",
    "w": {
      "OP-Crs C/90": 2.3,
      "Poss Won/90": 0.975,
      "Pres A/90": 1.35,
      "xA/90": 1.725,
      "Sprints/90": 1.575,
      "Pas %": 0.85
    },
    "x": "OP-Crs C/90",
    "y": "Pres A/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wm-MLR-Au",
    "type": "wm",
    "name": "Wide Midfielder",
    "duty": "Au",
    "dutyName": "Automatic",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "The two-way wide player of a flat midfield.",
    "w": {
      "OP-Crs C/90": 1.9,
      "Poss Won/90": 1.474,
      "Pres A/90": 1.45,
      "xA/90": 1.425,
      "Sprints/90": 1.525,
      "Pas %": 0.983
    },
    "x": "OP-Crs C/90",
    "y": "Pres A/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "winger-MLR-S",
    "type": "winger",
    "name": "Winger",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "Stays wide, beats his man and delivers.",
    "w": {
      "Drb/90": 2.5,
      "OP-Crs C/90": 2.5,
      "xA/90": 1.5,
      "OP-Cr %": 1,
      "Sprints/90": 1,
      "FA/90": 0.5
    },
    "x": "Drb/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "winger"
  },
  {
    "id": "winger-MLR-A",
    "type": "winger",
    "name": "Winger",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "Stays wide, beats his man and delivers.",
    "w": {
      "Drb/90": 2.75,
      "OP-Crs C/90": 2.875,
      "xA/90": 1.725,
      "OP-Cr %": 1.15,
      "Sprints/90": 1.05,
      "FA/90": 0.55
    },
    "x": "Drb/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "winger"
  },
  {
    "id": "wp-MLR-S",
    "type": "wp",
    "name": "Wide Playmaker",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "Drifts inside from the flank to create.",
    "w": {
      "OP-KP/90": 2.5,
      "xA/90": 2,
      "Ps A/90": 1.5,
      "Pr passes/90": 1.5,
      "Pas %": 1,
      "Drb/90": 1
    },
    "x": "Ps A/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wp-MLR-A",
    "type": "wp",
    "name": "Wide Playmaker",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "Drifts inside from the flank to create.",
    "w": {
      "OP-KP/90": 2.875,
      "xA/90": 2.3,
      "Ps A/90": 1.275,
      "Pr passes/90": 1.65,
      "Pas %": 0.85,
      "Drb/90": 1.1
    },
    "x": "Ps A/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "dw-MLR-D",
    "type": "dw",
    "name": "Defensive Winger",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "Presses the opposition flank first and supports the attack second.",
    "w": {
      "Pres A/90": 2,
      "Poss Won/90": 2.6,
      "Tck R": 1.95,
      "OP-Crs C/90": 1.05,
      "Sprints/90": 1.5,
      "xA/90": 0.7
    },
    "x": "Poss Won/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "dw-MLR-S",
    "type": "dw",
    "name": "Defensive Winger",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "Presses the opposition flank first and supports the attack second.",
    "w": {
      "Pres A/90": 2,
      "Poss Won/90": 2,
      "Tck R": 1.5,
      "OP-Crs C/90": 1.5,
      "Sprints/90": 1.5,
      "xA/90": 1
    },
    "x": "Poss Won/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "iw-MLR-S",
    "type": "iw",
    "name": "Inverted Winger",
    "duty": "S",
    "dutyName": "Support",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "Comes inside onto his stronger foot to create.",
    "w": {
      "Drb/90": 2,
      "OP-KP/90": 2.5,
      "xA/90": 1.5,
      "Shots Outside Box/90": 0.5,
      "Pas %": 1,
      "Ch C/90": 1
    },
    "x": "Drb/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iw"
  },
  {
    "id": "iw-MLR-A",
    "type": "iw",
    "name": "Inverted Winger",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "MLR",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att",
    "desc": "Comes inside onto his stronger foot to create.",
    "w": {
      "Drb/90": 2.2,
      "OP-KP/90": 2.875,
      "xA/90": 1.725,
      "Shots Outside Box/90": 0.675,
      "Pas %": 0.85,
      "Ch C/90": 1.15
    },
    "x": "Drb/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iw"
  },
  {
    "id": "ap-AMC-S",
    "type": "ap",
    "name": "Advanced Playmaker",
    "duty": "S",
    "dutyName": "Support",
    "strata": "AMC",
    "slots": [
      "AM-C"
    ],
    "tpl": "att",
    "desc": "Finds space between the lines and makes the final pass.",
    "w": {
      "OP-KP/90": 2.5,
      "xA/90": 2.5,
      "Drb/90": 1.5,
      "Pas %": 1,
      "Pr passes/90": 1,
      "CCC/90": 1
    },
    "x": "OP-KP/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "ap"
  },
  {
    "id": "ap-AMC-A",
    "type": "ap",
    "name": "Advanced Playmaker",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMC",
    "slots": [
      "AM-C"
    ],
    "tpl": "att",
    "desc": "Finds space between the lines and makes the final pass.",
    "w": {
      "OP-KP/90": 2.875,
      "xA/90": 2.875,
      "Drb/90": 1.65,
      "Pas %": 0.85,
      "Pr passes/90": 1.1,
      "CCC/90": 1.15
    },
    "x": "OP-KP/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "ap"
  },
  {
    "id": "am-AMC-S",
    "type": "am",
    "name": "Attacking Midfielder",
    "duty": "S",
    "dutyName": "Support",
    "strata": "AMC",
    "slots": [
      "AM-C"
    ],
    "tpl": "att",
    "desc": "Plays behind the striker, creating and arriving.",
    "w": {
      "npxG/90": 2,
      "xA/90": 2,
      "OP-KP/90": 1.5,
      "Drb/90": 1,
      "ShT/90": 1,
      "Pres A/90": 1
    },
    "x": "xA/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "am-AMC-A",
    "type": "am",
    "name": "Attacking Midfielder",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMC",
    "slots": [
      "AM-C"
    ],
    "tpl": "att",
    "desc": "Plays behind the striker, creating and arriving.",
    "w": {
      "npxG/90": 2.7,
      "xA/90": 2.3,
      "OP-KP/90": 1.725,
      "Drb/90": 1.1,
      "ShT/90": 1.35,
      "Pres A/90": 0.9
    },
    "x": "xA/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "eng-AMC-S",
    "type": "eng",
    "name": "Enganche",
    "duty": "S",
    "dutyName": "Support",
    "strata": "AMC",
    "slots": [
      "AM-C"
    ],
    "tpl": "att",
    "desc": "A static hub behind the strikers who everything goes through.",
    "w": {
      "Ps C/90": 2,
      "OP-KP/90": 2.5,
      "xA/90": 2,
      "Pas %": 1.5,
      "Loss rate": 1
    },
    "x": "Ps C/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "eng"
  },
  {
    "id": "treq-AMC-A",
    "type": "treq",
    "name": "Trequartista",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMC",
    "slots": [
      "AM-C"
    ],
    "tpl": "att",
    "desc": "A free role that creates through invention and doesn't defend.",
    "w": {
      "Drb/90": 2.75,
      "xA/90": 2.3,
      "npxG/90": 2.7,
      "OP-KP/90": 1.15,
      "CCC/90": 1.15
    },
    "x": "Drb/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "treq"
  },
  {
    "id": "ss-AMC-A",
    "type": "ss",
    "name": "Shadow Striker",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMC",
    "slots": [
      "AM-C"
    ],
    "tpl": "att",
    "desc": "Plays off a partner and arrives in scoring positions.",
    "w": {
      "npxG/90": 4.05,
      "Non-pen G/90": 2.025,
      "ShT/90": 2.025,
      "Pres A/90": 1.35,
      "Drb/90": 1.1
    },
    "x": "npxG/90",
    "y": "Pres A/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "winger-AMLR-S",
    "type": "winger",
    "name": "Winger",
    "duty": "S",
    "dutyName": "Support",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Stays wide, beats his man and delivers.",
    "w": {
      "Drb/90": 2.5,
      "OP-Crs C/90": 2.5,
      "xA/90": 1.5,
      "OP-Cr %": 1,
      "Sprints/90": 1,
      "FA/90": 0.5
    },
    "x": "Drb/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "winger"
  },
  {
    "id": "winger-AMLR-A",
    "type": "winger",
    "name": "Winger",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Stays wide, beats his man and delivers.",
    "w": {
      "Drb/90": 2.75,
      "OP-Crs C/90": 2.875,
      "xA/90": 1.725,
      "OP-Cr %": 1.15,
      "Sprints/90": 1.05,
      "FA/90": 0.55
    },
    "x": "Drb/90",
    "y": "OP-Crs C/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "winger"
  },
  {
    "id": "wp-AMLR-S",
    "type": "wp",
    "name": "Wide Playmaker",
    "duty": "S",
    "dutyName": "Support",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Drifts inside from the flank to create.",
    "w": {
      "OP-KP/90": 2.5,
      "xA/90": 2,
      "Ps A/90": 1.5,
      "Pr passes/90": 1.5,
      "Pas %": 1,
      "Drb/90": 1
    },
    "x": "Ps A/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wp-AMLR-A",
    "type": "wp",
    "name": "Wide Playmaker",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Drifts inside from the flank to create.",
    "w": {
      "OP-KP/90": 2.875,
      "xA/90": 2.3,
      "Ps A/90": 1.275,
      "Pr passes/90": 1.65,
      "Pas %": 0.85,
      "Drb/90": 1.1
    },
    "x": "Ps A/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "iw-AMLR-S",
    "type": "iw",
    "name": "Inverted Winger",
    "duty": "S",
    "dutyName": "Support",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Comes inside onto his stronger foot to create.",
    "w": {
      "Drb/90": 2,
      "OP-KP/90": 2.5,
      "xA/90": 1.5,
      "Shots Outside Box/90": 0.5,
      "Pas %": 1,
      "Ch C/90": 1
    },
    "x": "Drb/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iw"
  },
  {
    "id": "iw-AMLR-A",
    "type": "iw",
    "name": "Inverted Winger",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Comes inside onto his stronger foot to create.",
    "w": {
      "Drb/90": 2.2,
      "OP-KP/90": 2.875,
      "xA/90": 1.725,
      "Shots Outside Box/90": 0.675,
      "Pas %": 0.85,
      "Ch C/90": 1.15
    },
    "x": "Drb/90",
    "y": "OP-KP/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "iw"
  },
  {
    "id": "treq-AMLR-A",
    "type": "treq",
    "name": "Trequartista",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "A free role that creates through invention and doesn't defend.",
    "w": {
      "Drb/90": 2.75,
      "xA/90": 2.3,
      "npxG/90": 2.7,
      "OP-KP/90": 1.15,
      "CCC/90": 1.15
    },
    "x": "Drb/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "treq"
  },
  {
    "id": "if-AMLR-S",
    "type": "if",
    "name": "Inside Forward",
    "duty": "S",
    "dutyName": "Support",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Comes inside from the flank to score.",
    "w": {
      "npxG/90": 2.5,
      "Drb/90": 2,
      "ShT/90": 1.5,
      "Non-pen G/90": 1.5,
      "xA/90": 1,
      "Conv %": 1
    },
    "x": "npxG/90",
    "y": "Drb/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "if"
  },
  {
    "id": "if-AMLR-A",
    "type": "if",
    "name": "Inside Forward",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Comes inside from the flank to score.",
    "w": {
      "npxG/90": 3.375,
      "Drb/90": 2.2,
      "ShT/90": 2.025,
      "Non-pen G/90": 2.025,
      "xA/90": 1.15,
      "Conv %": 1.35
    },
    "x": "npxG/90",
    "y": "Drb/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "if"
  },
  {
    "id": "raum-AMLR-A",
    "type": "raum",
    "name": "Raumdeuter",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "Finds space in the box and finishes, with little involvement elsewhere.",
    "w": {
      "npxG/90": 4.05,
      "Non-pen G/90": 2.7,
      "ShT/90": 2.025,
      "npxG/Shot": 2.025,
      "Conv %": 1.35,
      "Off/90": 0.675
    },
    "x": "npxG/90",
    "y": "npxG/Shot",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wtf-AMLR-S",
    "type": "wtf",
    "name": "Wide Target Forward",
    "duty": "S",
    "dutyName": "Support",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "A physical outlet on the flank who wins headers and holds it up.",
    "w": {
      "Hdrs W/90": 2.5,
      "Hdr %": 2,
      "npxG/90": 1.5,
      "xA/90": 1,
      "FA/90": 1
    },
    "x": "Hdrs W/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "wtf-AMLR-A",
    "type": "wtf",
    "name": "Wide Target Forward",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "AMLR",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att",
    "desc": "A physical outlet on the flank who wins headers and holds it up.",
    "w": {
      "Hdrs W/90": 2.25,
      "Hdr %": 1.8,
      "npxG/90": 2.025,
      "xA/90": 1.15,
      "FA/90": 1.1
    },
    "x": "Hdrs W/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "treq-ST-A",
    "type": "treq",
    "name": "Trequartista",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "A free role that creates through invention and doesn't defend.",
    "w": {
      "Drb/90": 2.75,
      "xA/90": 2.3,
      "npxG/90": 2.7,
      "OP-KP/90": 1.15,
      "CCC/90": 1.15
    },
    "x": "Drb/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "treq"
  },
  {
    "id": "af-ST-A",
    "type": "af",
    "name": "Advanced Forward",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Plays on the last line and runs in behind.",
    "w": {
      "npxG/90": 4.05,
      "Sprints/90": 2.1,
      "ShT/90": 2.025,
      "Non-pen G/90": 2.025,
      "Drb/90": 1.1,
      "Conv %": 1.35
    },
    "x": "npxG/90",
    "y": "Sprints/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "af"
  },
  {
    "id": "cf-ST-S",
    "type": "cf",
    "name": "Complete Forward",
    "duty": "S",
    "dutyName": "Support",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Does everything: scores, links, holds it up and wins headers.",
    "w": {
      "npxG/90": 2,
      "xA/90": 2,
      "Hdrs W/90": 2,
      "Drb/90": 1,
      "Ps A/90": 1,
      "Non-pen G/90": 1.5
    },
    "x": "xA/90",
    "y": "Hdrs W/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "cf-s"
  },
  {
    "id": "cf-ST-A",
    "type": "cf",
    "name": "Complete Forward",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Does everything: scores, links, holds it up and wins headers.",
    "w": {
      "npxG/90": 2.7,
      "xA/90": 2.3,
      "Hdrs W/90": 1.8,
      "Drb/90": 1.1,
      "Ps A/90": 0.85,
      "Non-pen G/90": 2.025
    },
    "x": "npxG/90",
    "y": "Hdrs W/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "cf-a"
  },
  {
    "id": "dlf-ST-S",
    "type": "dlf",
    "name": "Deep-Lying Forward",
    "duty": "S",
    "dutyName": "Support",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Drops in to link and create, but still has to score.",
    "w": {
      "OP-KP/90": 2,
      "npxG/90": 2,
      "Ps A/90": 1.5,
      "xA/90": 1.5,
      "Hdrs W/90": 1,
      "Pas %": 1
    },
    "x": "OP-KP/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "dlf"
  },
  {
    "id": "dlf-ST-A",
    "type": "dlf",
    "name": "Deep-Lying Forward",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Drops in to link and create, but still has to score.",
    "w": {
      "OP-KP/90": 2.3,
      "npxG/90": 2.7,
      "Ps A/90": 1.275,
      "xA/90": 1.725,
      "Hdrs W/90": 0.9,
      "Pas %": 0.85
    },
    "x": "OP-KP/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "dlf"
  },
  {
    "id": "f9-ST-S",
    "type": "f9",
    "name": "False Nine",
    "duty": "S",
    "dutyName": "Support",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Drops into midfield to create overloads. Judge him as a playmaker.",
    "w": {
      "Ps A/90": 2,
      "xA/90": 2.5,
      "OP-KP/90": 2,
      "Drb/90": 1.5,
      "Pr passes/90": 1,
      "npxG/90": 1
    },
    "x": "Ps A/90",
    "y": "xA/90",
    "xdir": 1,
    "ydir": 1,
    "guide": "f9"
  },
  {
    "id": "poacher-ST-A",
    "type": "poacher",
    "name": "Poacher",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Lives in the box and is judged almost entirely on finishing.",
    "w": {
      "npxG/90": 4.05,
      "Conv %": 2.7,
      "Non-pen G/90": 2.7,
      "npxG/Shot": 2.025,
      "ShT/90": 1.35,
      "Off/90": 0.675
    },
    "x": "npxG/90",
    "y": "Conv %",
    "xdir": 1,
    "ydir": 1,
    "guide": "poacher"
  },
  {
    "id": "pf-ST-D",
    "type": "pf",
    "name": "Pressing Forward",
    "duty": "D",
    "dutyName": "Defend",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Leads the press from the front and still threatens goal.",
    "w": {
      "Pres A/90": 2.5,
      "Pres C/90": 2,
      "Poss Won/90": 1.95,
      "npxG/90": 1,
      "Sprints/90": 1.5,
      "Tck W/90": 1.3
    },
    "x": "Pres C/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "pf-ST-S",
    "type": "pf",
    "name": "Pressing Forward",
    "duty": "S",
    "dutyName": "Support",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Leads the press from the front and still threatens goal.",
    "w": {
      "Pres A/90": 2.5,
      "Pres C/90": 2,
      "Poss Won/90": 1.5,
      "npxG/90": 2,
      "Sprints/90": 1.5,
      "Tck W/90": 1
    },
    "x": "Pres C/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "pf-ST-A",
    "type": "pf",
    "name": "Pressing Forward",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "Leads the press from the front and still threatens goal.",
    "w": {
      "Pres A/90": 2.25,
      "Pres C/90": 1.8,
      "Poss Won/90": 0.975,
      "npxG/90": 2.7,
      "Sprints/90": 1.575,
      "Tck W/90": 0.65
    },
    "x": "Pres C/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "tf-ST-S",
    "type": "tf",
    "name": "Target Forward",
    "duty": "S",
    "dutyName": "Support",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "The physical focal point who wins headers and brings others in.",
    "w": {
      "Hdrs W/90": 3,
      "Hdr %": 2,
      "npxG/90": 2,
      "FA/90": 1,
      "xA/90": 1,
      "K Hdrs/90": 0.5
    },
    "x": "Hdrs W/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  },
  {
    "id": "tf-ST-A",
    "type": "tf",
    "name": "Target Forward",
    "duty": "A",
    "dutyName": "Attack",
    "strata": "ST",
    "slots": [
      "ST-C"
    ],
    "tpl": "st",
    "desc": "The physical focal point who wins headers and brings others in.",
    "w": {
      "Hdrs W/90": 2.7,
      "Hdr %": 1.8,
      "npxG/90": 2.7,
      "FA/90": 1.1,
      "xA/90": 1.15,
      "K Hdrs/90": 0.45
    },
    "x": "Hdrs W/90",
    "y": "npxG/90",
    "xdir": 1,
    "ydir": 1,
    "guide": null
  }
] as const;

export const FM24_STAT_META = {
  "xGP/90": [
    "gk",
    1,
    false,
    null
  ],
  "Save %": [
    "gk",
    1,
    true,
    [
      "_saves_faced",
      30
    ]
  ],
  "Catch rate": [
    "gk",
    1,
    true,
    [
      "_saves",
      20
    ]
  ],
  "CS/Start": [
    "gk",
    1,
    true,
    [
      "Starts",
      8
    ]
  ],
  "Shots faced/90": [
    "ctx",
    1,
    true,
    null
  ],
  "Pen save %": [
    "gk",
    1,
    true,
    [
      "Pens Faced",
      3
    ]
  ],
  "Con/90": [
    "gk",
    -1,
    false,
    null
  ],
  "npxG/90": [
    "shoot",
    1,
    true,
    null
  ],
  "Non-pen G/90": [
    "shoot",
    1,
    true,
    null
  ],
  "npG-npxG/90": [
    "shoot",
    1,
    true,
    [
      "_npshots",
      15
    ]
  ],
  "npxG/Shot": [
    "shoot",
    1,
    true,
    [
      "_npshots",
      12
    ]
  ],
  "G/SoT": [
    "shoot",
    1,
    true,
    [
      "ShT",
      8
    ]
  ],
  "Long-shot share": [
    "shoot",
    1,
    true,
    [
      "Shots",
      15
    ]
  ],
  "xG/90": [
    "shoot",
    1,
    false,
    null
  ],
  "Gls/90": [
    "shoot",
    1,
    false,
    null
  ],
  "Shot/90": [
    "shoot",
    1,
    false,
    null
  ],
  "ShT/90": [
    "shoot",
    1,
    false,
    null
  ],
  "Shot %": [
    "shoot",
    1,
    false,
    [
      "Shots",
      10
    ]
  ],
  "Conv %": [
    "shoot",
    1,
    false,
    [
      "Shots",
      15
    ]
  ],
  "Shots Outside Box/90": [
    "shoot",
    1,
    false,
    null
  ],
  "Off/90": [
    "shoot",
    -1,
    true,
    null
  ],
  "Pen conv": [
    "shoot",
    1,
    true,
    [
      "Pens",
      3
    ]
  ],
  "xA/90": [
    "create",
    1,
    false,
    null
  ],
  "OP-KP/90": [
    "create",
    1,
    false,
    null
  ],
  "K Ps/90": [
    "create",
    1,
    false,
    null
  ],
  "Ch C/90": [
    "create",
    1,
    false,
    null
  ],
  "Asts/90": [
    "create",
    1,
    false,
    null
  ],
  "CCC/90": [
    "create",
    1,
    true,
    null
  ],
  "npxG+xA/90": [
    "create",
    1,
    true,
    null
  ],
  "G+A np/90": [
    "create",
    1,
    true,
    null
  ],
  "A-xA/90": [
    "create",
    1,
    true,
    [
      "K Pas",
      15
    ]
  ],
  "xA/KP": [
    "create",
    1,
    true,
    [
      "K Pas",
      10
    ]
  ],
  "OP-KP share": [
    "create",
    1,
    true,
    [
      "K Pas",
      10
    ]
  ],
  "OP-Crs C/90": [
    "create",
    1,
    false,
    null
  ],
  "OP-Crs A/90": [
    "create",
    1,
    false,
    null
  ],
  "OP-Cr %": [
    "create",
    1,
    false,
    [
      "OP-Crs A",
      20
    ]
  ],
  "Cr C/90": [
    "create",
    1,
    false,
    null
  ],
  "Cr C/A": [
    "create",
    1,
    false,
    [
      "Cr A",
      20
    ]
  ],
  "Pr passes/90": [
    "prog",
    1,
    false,
    null
  ],
  "Drb/90": [
    "prog",
    1,
    false,
    null
  ],
  "Prog/90": [
    "prog",
    1,
    true,
    null
  ],
  "Verticality": [
    "prog",
    1,
    true,
    [
      "Pas A",
      200
    ]
  ],
  "FA/90": [
    "prog",
    1,
    true,
    null
  ],
  "Pas %": [
    "retain",
    1,
    false,
    [
      "Pas A",
      200
    ]
  ],
  "Ps A/90": [
    "retain",
    1,
    false,
    null
  ],
  "Ps C/90": [
    "retain",
    1,
    false,
    null
  ],
  "Poss Lost/90": [
    "retain",
    -1,
    false,
    null
  ],
  "Loss rate": [
    "retain",
    -1,
    true,
    [
      "Pas A",
      200
    ]
  ],
  "Passes per loss": [
    "retain",
    1,
    true,
    [
      "Pas A",
      200
    ]
  ],
  "Tck W/90": [
    "def",
    1,
    true,
    null
  ],
  "Tck/90": [
    "def",
    1,
    false,
    null
  ],
  "Tck R": [
    "def",
    1,
    false,
    [
      "Tck A",
      15
    ]
  ],
  "TklW+Int/90": [
    "def",
    1,
    true,
    null
  ],
  "Poss Won/90": [
    "def",
    1,
    false,
    null
  ],
  "K Tck/90": [
    "def",
    1,
    false,
    null
  ],
  "K Tck share": [
    "def",
    1,
    true,
    [
      "Tck W",
      15
    ]
  ],
  "Fls/Tck": [
    "def",
    -1,
    true,
    [
      "Tck A",
      15
    ]
  ],
  "Errors/90": [
    "def",
    -1,
    true,
    null
  ],
  "Cards/90": [
    "def",
    -1,
    true,
    null
  ],
  "Fls/90": [
    "def",
    -1,
    true,
    null
  ],
  "Int/90": [
    "read",
    1,
    false,
    null
  ],
  "Blk/90": [
    "read",
    1,
    false,
    null
  ],
  "Clr/90": [
    "read",
    1,
    false,
    null
  ],
  "Shts Blckd/90": [
    "read",
    1,
    false,
    null
  ],
  "Def actions/90": [
    "read",
    1,
    true,
    null
  ],
  "Box def/90": [
    "read",
    1,
    true,
    null
  ],
  "Hdr %": [
    "aer",
    1,
    false,
    [
      "Hdrs A",
      20
    ]
  ],
  "Hdrs W/90": [
    "aer",
    1,
    false,
    null
  ],
  "Aer A/90": [
    "aer",
    1,
    false,
    null
  ],
  "K Hdrs/90": [
    "aer",
    1,
    false,
    null
  ],
  "K Hdr share": [
    "aer",
    1,
    true,
    [
      "Hdrs",
      15
    ]
  ],
  "Hdrs L/90": [
    "aer",
    -1,
    false,
    null
  ],
  "Pres A/90": [
    "press",
    1,
    false,
    null
  ],
  "Pres C/90": [
    "press",
    1,
    false,
    null
  ],
  "Press success": [
    "press",
    1,
    true,
    [
      "Pres A",
      60
    ]
  ],
  "Sprints/90": [
    "phys",
    1,
    false,
    null
  ],
  "Dist/90 km": [
    "phys",
    1,
    true,
    null
  ],
  "Sprints/km": [
    "phys",
    1,
    true,
    null
  ],
  "Pres/km": [
    "press",
    1,
    true,
    null
  ],
  "Start rate": [
    "ctx",
    1,
    true,
    [
      "Apps",
      8
    ]
  ],
  "Mins/App": [
    "ctx",
    1,
    true,
    [
      "Apps",
      8
    ]
  ],
  "PoM/Start": [
    "ctx",
    1,
    true,
    [
      "Starts",
      8
    ]
  ],
  "Av Rat": [
    "ctx",
    1,
    false,
    null
  ]
} as const;

export const FM24_STRATA = {
  "GK": {
    "label": "Goalkeeper",
    "slots": [
      "GK"
    ],
    "tpl": "gk"
  },
  "DC": {
    "label": "Centre-back",
    "slots": [
      "D-C"
    ],
    "tpl": "cb"
  },
  "DLR": {
    "label": "Full-back (D L/R)",
    "slots": [
      "D-L",
      "D-R"
    ],
    "tpl": "fb"
  },
  "WB": {
    "label": "Wing-back (WB L/R)",
    "slots": [
      "WB-L",
      "WB-R"
    ],
    "tpl": "fb"
  },
  "DM": {
    "label": "Defensive midfield",
    "slots": [
      "DM"
    ],
    "tpl": "mid"
  },
  "MC": {
    "label": "Central midfield",
    "slots": [
      "M-C"
    ],
    "tpl": "mid"
  },
  "MLR": {
    "label": "Wide midfield (M L/R)",
    "slots": [
      "M-L",
      "M-R"
    ],
    "tpl": "att"
  },
  "AMC": {
    "label": "Attacking midfield (AM C)",
    "slots": [
      "AM-C"
    ],
    "tpl": "att"
  },
  "AMLR": {
    "label": "Wide attack (AM L/R)",
    "slots": [
      "AM-L",
      "AM-R"
    ],
    "tpl": "att"
  },
  "ST": {
    "label": "Striker",
    "slots": [
      "ST-C"
    ],
    "tpl": "st"
  }
} as const;

/** V1 starting philosophy weights by role type: keep, available, hurt, win, front, intensity. */
export const FM24_PHILOSOPHY_BASE_WEIGHTS = {
  "gk": [
    1,
    0,
    0,
    0,
    1,
    0
  ],
  "sk": [
    3,
    2,
    1,
    0,
    3,
    0
  ],
  "cd": [
    2,
    1,
    1,
    1,
    3,
    1
  ],
  "bpd": [
    3,
    2,
    2,
    1,
    3,
    1
  ],
  "nncb": [
    1,
    0,
    0,
    1,
    3,
    1
  ],
  "wcb": [
    3,
    2,
    2,
    1,
    2,
    2
  ],
  "libero": [
    3,
    3,
    3,
    1,
    2,
    1
  ],
  "fb": [
    2,
    2,
    2,
    2,
    2,
    2
  ],
  "nnfb": [
    1,
    1,
    0,
    1,
    3,
    1
  ],
  "wb": [
    2,
    2,
    3,
    2,
    1,
    3
  ],
  "cwb": [
    2,
    2,
    3,
    2,
    1,
    3
  ],
  "iwb": [
    3,
    3,
    2,
    2,
    2,
    1
  ],
  "ifb": [
    3,
    2,
    1,
    1,
    3,
    1
  ],
  "dm": [
    3,
    2,
    1,
    2,
    2,
    1
  ],
  "dlp": [
    3,
    3,
    3,
    1,
    2,
    1
  ],
  "anchor": [
    3,
    2,
    0,
    1,
    3,
    1
  ],
  "bwm": [
    2,
    1,
    1,
    3,
    2,
    3
  ],
  "hb": [
    3,
    3,
    2,
    1,
    3,
    1
  ],
  "regista": [
    3,
    3,
    3,
    1,
    1,
    1
  ],
  "rpm": [
    3,
    3,
    3,
    2,
    1,
    2
  ],
  "sv": [
    2,
    2,
    3,
    2,
    1,
    2
  ],
  "cm": [
    3,
    3,
    2,
    2,
    1,
    2
  ],
  "b2b": [
    2,
    2,
    2,
    3,
    1,
    3
  ],
  "ap": [
    3,
    3,
    3,
    2,
    0,
    1
  ],
  "mez": [
    2,
    3,
    3,
    2,
    0,
    2
  ],
  "carr": [
    3,
    3,
    1,
    2,
    1,
    2
  ],
  "wm": [
    2,
    2,
    2,
    2,
    1,
    2
  ],
  "winger": [
    1,
    2,
    3,
    2,
    0,
    2
  ],
  "wp": [
    3,
    3,
    3,
    2,
    0,
    1
  ],
  "dw": [
    2,
    1,
    1,
    3,
    1,
    3
  ],
  "iw": [
    2,
    2,
    3,
    2,
    0,
    2
  ],
  "am": [
    2,
    2,
    3,
    2,
    0,
    1
  ],
  "eng": [
    3,
    3,
    3,
    0,
    0,
    0
  ],
  "treq": [
    2,
    2,
    3,
    0,
    0,
    1
  ],
  "ss": [
    1,
    1,
    2,
    2,
    0,
    2
  ],
  "if": [
    1,
    2,
    3,
    2,
    0,
    2
  ],
  "raum": [
    1,
    1,
    2,
    2,
    0,
    2
  ],
  "wtf": [
    1,
    1,
    1,
    2,
    0,
    2
  ],
  "af": [
    1,
    1,
    2,
    2,
    0,
    3
  ],
  "cf": [
    2,
    2,
    3,
    2,
    0,
    2
  ],
  "dlf": [
    3,
    3,
    3,
    2,
    0,
    1
  ],
  "f9": [
    3,
    3,
    3,
    2,
    0,
    1
  ],
  "poacher": [
    1,
    1,
    1,
    2,
    0,
    2
  ],
  "pf": [
    1,
    1,
    1,
    3,
    0,
    3
  ],
  "tf": [
    1,
    1,
    1,
    2,
    0,
    2
  ]
} as const;
