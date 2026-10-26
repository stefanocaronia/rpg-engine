// The people the page knows, for the portraits an extension's drawing shows (D-510): the party, then those at the character's place.
import { createContext } from "preact";
import type { Tokened } from "./party.tsx";

/** The party and those at the place, as their tokens show them. */
export const PeopleContext = createContext<Tokened[]>([]);
