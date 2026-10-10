/**
 * Ready-made avatars: famous game characters (official art via IGDB), so every player
 * can have a face from the start, no upload needed. A fixed list, so it never depends
 * on IGDB answering; choosing one stores just its key (no safety check needed).
 */
export const AVATAR_PRESETS = [
  { key: 'geralt', name: 'Geralt', game: 'The Witcher', imageId: 'cm36u' },
  { key: 'ciri', name: 'Ciri', game: 'The Witcher 3', imageId: 'b2f4qo7yzuzr1ly0swci' },
  { key: 'triss', name: 'Triss', game: 'The Witcher 3', imageId: 'jec1fydhokwngsgfypix' },
  { key: 'kratos', name: 'Kratos', game: 'God of War', imageId: 'cm2zp' },
  { key: 'arthur', name: 'Arthur Morgan', game: 'Red Dead Redemption 2', imageId: 'cm32b' },
  { key: 'joel', name: 'Joel', game: 'The Last of Us', imageId: 'dyad0ufdamgsjft6a5a5' },
  { key: 'ellie', name: 'Ellie', game: 'The Last of Us', imageId: 'jfisdrxsrdewyre5rquq' },
  { key: 'lara', name: 'Lara Croft', game: 'Tomb Raider', imageId: 'x8dvko1lp7rqv3bx3rpr' },
  { key: 'drake', name: 'Nathan Drake', game: 'Uncharted', imageId: 'jler3mb6yjfotv9vlesw' },
  { key: 'link', name: 'Link', game: 'The Legend of Zelda', imageId: 'cm31d' },
  { key: 'zelda', name: 'Zelda', game: 'The Legend of Zelda', imageId: 'q64bgyomnbk5spyikkex' },
  { key: 'mario', name: 'Mario', game: 'Super Mario', imageId: 'iurhmhenrrsdnsc4zbva' },
  { key: 'pikachu', name: 'Pikachu', game: 'Pokémon', imageId: 'y52bnmip6yfux4tmwmzj' },
  { key: 'samus', name: 'Samus Aran', game: 'Metroid', imageId: 'ilgqsndahl8sjk5navaw' },
  { key: 'cloud', name: 'Cloud Strife', game: 'Final Fantasy VII', imageId: 'cm36y' },
  { key: 'snake', name: 'Solid Snake', game: 'Metal Gear Solid', imageId: 'cm33n' },
  { key: 'dante', name: 'Dante', game: 'Devil May Cry', imageId: 'e1du3dmaitikgdrxail0' },
  { key: 'bayonetta', name: 'Bayonetta', game: 'Bayonetta', imageId: 'cm37x' },
  { key: 'kiryu', name: 'Kazuma Kiryu', game: 'Like a Dragon', imageId: 'cm33a' },
  { key: 'gordon', name: 'Gordon Freeman', game: 'Half-Life', imageId: 'o19hpyobzv0vbjcebokj' },
  { key: 'ratchet', name: 'Ratchet', game: 'Ratchet & Clank', imageId: 'cm329' },
].map((preset) => ({ ...preset, url: `https://images.igdb.com/igdb/image/upload/t_cover_big/${preset.imageId}.jpg` }));

export const presetByKey = new Map(AVATAR_PRESETS.map((preset) => [preset.key, preset]));
