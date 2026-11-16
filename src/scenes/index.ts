import type { SceneFactory } from './kit';
import { acksession } from './acksession';
import { luciq } from './luciq';
import { atentec } from './atentec';
import { internships } from './internships';
import { icpc } from './icpc';
import { agentii } from './agentii';
import { catalyst } from './catalyst';
import { cptools } from './cptools';
import { taraweeh } from './taraweeh';
import { nexus } from './nexus';
import { gold } from './gold';
import { portfolio } from './portfolio';
import { focal } from './focal';

/** Keyed by each canvas's data-art. */
export const SCENES: Record<string, SceneFactory> = {
  acksession, luciq, atentec, internships, icpc,
  agentii, catalyst, cptools, taraweeh, nexus, gold, portfolio, focal,
};
