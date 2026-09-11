/**
 * Where hamburger overlays (About, Tips) should go when the user presses back.
 * If they opened the overlay as the first stack screen, native `goBack` has
 * nowhere to pop — fall back to the last tab instead of an empty card.
 */
export function resolveOverlayBackTarget({
  returnScreen,
  overlayId,
  lastTabScreen,
}) {
  if (
    typeof returnScreen === "string" &&
    returnScreen.length > 0 &&
    returnScreen !== overlayId
  ) {
    return returnScreen;
  }
  if (typeof lastTabScreen === "string" && lastTabScreen.length > 0) {
    return lastTabScreen;
  }
  return "opportunities";
}
