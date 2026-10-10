// The world map for any game: roads as stretches between stops, the quickest way across them, and points with their directions and distances. Depends on
// nothing else in rpg-engine.
export { crossingAlong, directionHelp, directionName, directionTo, distanceBetween, meanPoint, type Point, pointAlong, pointFrom, readDirection } from "./geometry.ts";
export { biomes, placeKinds } from "./looks.ts";
export { quickestWay, type Speed, type Start, type Step, type Stretch, stretchesOf, type Way } from "./ways.ts";
