import test from "node:test";
import assert from "node:assert/strict";
import { deliveryKey } from "./media_cutout_service.ts";

test("creator delivery keeps each cutout under the creator namespace", () => {
  assert.equal(deliveryKey("creator-17", "camera.png"), "creators/creator-17/cutouts/camera.png");
});
