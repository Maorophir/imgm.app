-- The game-character avatars (official art of other companies' characters, loaded from
-- IGDB) are replaced by IMGM's own 24 original characters. Every player who had picked
-- a character gets the closest new one, and their picture's time moves on: browsers
-- keep an avatar for a year under an address that includes that time, so a new time is
-- what makes them load the new picture.
UPDATE "User" SET "avatarUpdatedAt" = NOW()
WHERE "id" IN (
  SELECT "userId" FROM "UserAvatar"
  WHERE "preset" IN ('geralt', 'ciri', 'triss', 'kratos', 'arthur', 'joel', 'ellie', 'lara', 'drake', 'link', 'zelda',
                     'mario', 'pikachu', 'samus', 'cloud', 'snake', 'dante', 'bayonetta', 'kiryu', 'gordon', 'ratchet')
);

UPDATE "UserAvatar" SET "preset" = CASE "preset"
  WHEN 'geralt' THEN 'witchhunter'
  WHEN 'ciri' THEN 'elfarcher'
  WHEN 'triss' THEN 'mage'
  WHEN 'kratos' THEN 'viking'
  WHEN 'arthur' THEN 'gunslinger'
  WHEN 'joel' THEN 'survivor'
  WHEN 'ellie' THEN 'ranger'
  WHEN 'lara' THEN 'rogue'
  WHEN 'drake' THEN 'mechanic'
  WHEN 'link' THEN 'knight'
  WHEN 'zelda' THEN 'mage'
  WHEN 'mario' THEN 'farmer'
  WHEN 'pikachu' THEN 'alien'
  WHEN 'samus' THEN 'bountyhunter'
  WHEN 'cloud' THEN 'ronin'
  WHEN 'snake' THEN 'rogue'
  WHEN 'dante' THEN 'soulknight'
  WHEN 'bayonetta' THEN 'witchhunter'
  WHEN 'kiryu' THEN 'detective'
  WHEN 'gordon' THEN 'cyborg'
  WHEN 'ratchet' THEN 'robot'
END
WHERE "preset" IN ('geralt', 'ciri', 'triss', 'kratos', 'arthur', 'joel', 'ellie', 'lara', 'drake', 'link', 'zelda',
                   'mario', 'pikachu', 'samus', 'cloud', 'snake', 'dante', 'bayonetta', 'kiryu', 'gordon', 'ratchet');
