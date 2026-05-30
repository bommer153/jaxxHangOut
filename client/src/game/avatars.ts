/**
 * avatars.ts — single source of truth for all selectable avatars.
 *
 * Vite bundles each import as a hashed asset URL, so PNG files are
 * automatically copied to /dist and the URLs stay correct in production.
 *
 * The array index IS the avatarIndex sent over the network — do not
 * reorder entries once players are in a session (it would swap their
 * chosen characters). Append new avatars at the end only.
 */

import a00 from '../assets/0421f3ca-98f2-4d67-a583-281b80ae703b_removalai_preview.png';
import a01 from '../assets/21886f4b-20ab-4770-903d-773ece608ce5_removalai_preview.png';
import a02 from '../assets/243f54f7-040e-404a-9c7e-60216a9dc1d5_removalai_preview.png';
import a03 from '../assets/39a76531-6ad7-4fbc-a17a-e2a7391b9ea9_removalai_preview.png';
import a04 from '../assets/4596c54a-6dd3-4d83-9b07-a23314e954d2_removalai_preview.png';
import a05 from '../assets/4b7fea1e-bf4e-4774-87c3-43e4434af287_removalai_preview.png';
import a06 from '../assets/50ee800a-4ccd-45a8-b8f2-cd687c5e0294_removalai_preview.png';
import a07 from '../assets/5da63002-bb4f-42bb-89d9-a0ea816a0b4d_removalai_preview.png';
import a08 from '../assets/92287875-a0cb-471c-9259-ba7313500a80_removalai_preview.png';
import a09 from '../assets/ce9a25c0-078b-4a49-b718-1d5eb4aa9a71_removalai_preview.png';
import a10 from '../assets/f3c8d1c6-a438-4d81-9e0f-6e4258e9de1a_removalai_preview.png';
import a11 from '../assets/fda4d90c-8099-4576-9de3-afc117bf62b5_removalai_preview.png';

export interface AvatarEntry {
  /** Vite-resolved asset URL used both by <img> in the picker and Phaser.load.image */
  url:  string;
  name: string;
}

export const AVATARS: AvatarEntry[] = [
  { url: a00, name: 'Cyberpunk'      },
  { url: a01, name: 'The Goth'       },
  { url: a02, name: 'Lo-Fi Idol'     },
  { url: a03, name: 'The Casual'     },
  { url: a04, name: 'E-Girl'         },
  { url: a05, name: 'The Techie'     },
  { url: a06, name: 'The Ronin'      },
  { url: a07, name: 'Hypebeast'      },
  { url: a08, name: 'Retro Arcade'   },
  { url: a09, name: 'The Chill One'  },
  { url: a10, name: 'Cyber Ronin'    },
  { url: a11, name: 'The Streamer'   },
];

/** Phaser texture key for a given avatar index */
export const avatarKey = (index: number) => `avatar_${index}`;
