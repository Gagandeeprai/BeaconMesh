/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Vessel, VesselMedia } from "../types";

interface VesselMediaProvider {
  id: string;
  name: string;
  resolve: (vessel: Vessel) => VesselMedia | null;
}

const embeddedVerifiedMediaProvider: VesselMediaProvider = {
  id: "embedded-vessel-media",
  name: "Embedded Vessel Media",
  resolve: (vessel) => {
    if (!vessel.media?.verified || !vessel.media.photoUrl) return null;

    return {
      photoUrl: vessel.media.photoUrl,
      source: vessel.media.source,
      lastUpdated: vessel.media.lastUpdated,
      verified: true
    };
  }
};

const activeMediaProviders: VesselMediaProvider[] = [
  embeddedVerifiedMediaProvider
];

export function resolveVerifiedVesselMedia(vessel: Vessel | null): VesselMedia | null {
  if (!vessel?.isLiveAIS) return null;

  for (const provider of activeMediaProviders) {
    const media = provider.resolve(vessel);
    if (media?.verified && media.photoUrl) return media;
  }

  return null;
}
