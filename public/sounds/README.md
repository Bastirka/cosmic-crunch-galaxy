# Cosmic Crunch — sound assets

By default the game uses **synthesized** Web Audio sounds (see `src/lib/audio.ts`),
so this folder can be empty and the game ships with **no audio files and no
copyrighted assets**.

## Replacing the synthesized sounds with your own files

1. Add optimized, **non-copyrighted** files here, e.g.:

   ```
   public/sounds/click.mp3
   public/sounds/buy.mp3
   public/sounds/upgrade.mp3
   public/sounds/achievement.mp3
   public/sounds/daily.mp3
   public/sounds/offline.mp3
   public/sounds/quest.mp3
   public/sounds/questReward.mp3
   public/sounds/event.mp3
   public/sounds/ascension.mp3
   public/sounds/error.mp3
   public/sounds/ambient-loop.mp3
   ```

   Keep them small (short SFX < ~50 KB each; a looping ambient track ideally
   < ~1–2 MB, mono, ~96 kbps is plenty).

2. In `src/lib/audio.ts`:
   - Set `USE_SFX_FILES = true` and fill in the `SFX_FILES` map with the paths
     above (keys are the `SoundName` values).
   - Set `MUSIC_FILE = '/sounds/ambient-loop.mp3'` to use a real music loop
     instead of the synthesized drone.

3. That's it — volume/mute/settings all keep working; the engine just routes
   file playback through the same master/music/SFX volume controls.

Files referenced by `/sounds/...` are served from this `public/` folder by Vite.
