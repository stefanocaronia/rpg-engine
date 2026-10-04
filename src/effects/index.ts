// Conditions and effects on whoever has them (D-123, D-132): a line of text each, with temporary values and an end in game time or in rounds. It knows no game.
export { type Effect, type EffectEnd, effectNamed, endsAtTurn, formatEffect, formatEnd, isSceneDuration, keeperOf, readEffect, readEffects, readRounds, withEffect } from "./effect.ts";
