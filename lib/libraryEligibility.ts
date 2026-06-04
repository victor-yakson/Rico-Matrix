export const MIN_LIBRARY_BUY_CHAPTER = 1;
export const MIN_LIBRARY_PUBLISH_CHAPTER = 3;

export const getHighestUnlockedChapter = (
  track1Unlocked?: number | null,
  track2Unlocked?: number | null
) => Math.max(track1Unlocked ?? 0, track2Unlocked ?? 0);

export const canBuyLibraryBook = (
  track1Unlocked?: number | null,
  track2Unlocked?: number | null
) =>
  getHighestUnlockedChapter(track1Unlocked, track2Unlocked) >=
  MIN_LIBRARY_BUY_CHAPTER;

export const canPublishLibraryBook = (
  track1Unlocked?: number | null,
  track2Unlocked?: number | null
) =>
  getHighestUnlockedChapter(track1Unlocked, track2Unlocked) >=
  MIN_LIBRARY_PUBLISH_CHAPTER;
