import { deriveIdFromName } from './ServiceManager';

const nameToIds: [string, any][] = [
  ['RTÉ', 'RTE'],
  ['historielærer.dk', 'historielaerer.dk'],
  ['C&A', 'C-A'],
  ['123devis.com', '123devis.com'],
  // ['туту.ру', 'tutu.ru'], // not yet supported
  // ['抖音短视频', 'Douyin'], // not yet supported
  // Punctuation is supported, except characters that have meaning at filesystem level (:, /, \). These are replaced with a dash (-).
  ['Booking.com', 'Booking.com'],
  ['Yahoo!', 'Yahoo!'],
  ['re:start', 're-start'],
  ['we://', 'we---'],
  // Capitals and spaces are supported. Casing and spacing are expected to reflect the official service name casing and spacing.
  ['App Store', 'App Store'],
  ['DeviantArt', 'DeviantArt'],
];

test('Derive id from name', async () => {
  nameToIds.forEach(([name, expectedId]) =>
    expect(deriveIdFromName(name)).toStrictEqual(expectedId)
  );
});
