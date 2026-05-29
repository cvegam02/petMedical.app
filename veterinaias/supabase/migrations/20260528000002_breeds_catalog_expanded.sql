-- Expanded breeds catalog for autocomplete suggestions
-- Breeds table remains as reference data only (no longer FK from pets)

-- Perro
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  -- Populares / compañía
  ('Labrador Retriever'), ('Golden Retriever'), ('Bulldog Inglés'), ('Bulldog Francés'),
  ('Pastor Alemán'), ('Caniche/Poodle'), ('Chihuahua'), ('Beagle'),
  ('Yorkshire Terrier'), ('Shih Tzu'), ('Boxer'), ('Schnauzer Miniatura'),
  ('Schnauzer Estándar'), ('Dálmata'), ('Cocker Spaniel Inglés'), ('Cocker Spaniel Americano'),
  ('Dachshund/Teckel'), ('Pomerania'), ('Husky Siberiano'), ('Malamute de Alaska'),
  ('Samoyedo'), ('Border Collie'), ('Collie de Pelo Largo'), ('Shetland Sheepdog'),
  ('Australian Shepherd'), ('Jack Russell Terrier'), ('West Highland Terrier'),
  ('Scottish Terrier'), ('Maltés'), ('Bichón Frisé'), ('Havanese'),
  ('Pug/Carlino'), ('Boston Terrier'), ('Doberman'), ('Rottweiler'),
  ('Gran Danés'), ('San Bernardo'), ('Newfoundland'), ('Mastín Inglés'),
  ('Shar Pei'), ('Chow Chow'), ('Akita Inu'), ('Shiba Inu'),
  ('Basenji'), ('Weimaraner'), ('Vizsla'), ('Braco Alemán de Pelo Corto'),
  ('Setter Irlandés'), ('Spaniel Bretón'), ('Pointer Inglés'), ('Galgo Español'),
  ('Greyhound'), ('Whippet'), ('Saluki'), ('Afghan Hound'),
  ('Lhasa Apso'), ('Pekinés'), ('Bichón Habanero'), ('Spitz Alemán'),
  ('Mestizo')
) AS b(name)
WHERE s.name = 'Perro'
ON CONFLICT (species_id, name) DO NOTHING;

-- Gato
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Siamés'), ('Persa'), ('Maine Coon'), ('Bengalí'), ('Ragdoll'),
  ('Angora Turco'), ('Abisinio'), ('British Shorthair'), ('Scottish Fold'),
  ('Sphynx'), ('Birmano'), ('Ragamuffin'), ('Norwegian Forest Cat'),
  ('Russian Blue'), ('Burmés'), ('Exotic Shorthair'), ('Himalayo'),
  ('Devon Rex'), ('Cornish Rex'), ('American Shorthair'), ('Oriental'),
  ('Tonkinés'), ('Ocicat'), ('Savannah'), ('Chartreux'),
  ('Somali'), ('Balinés'), ('Turco Van'), ('Manx'),
  ('Mestizo')
) AS b(name)
WHERE s.name = 'Gato'
ON CONFLICT (species_id, name) DO NOTHING;

-- Conejo
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Holland Lop'), ('Mini Rex'), ('Angora Inglés'), ('Angora Francés'),
  ('Cabeza de León'), ('Netherland Dwarf'), ('Mini Lop'), ('Rex'),
  ('Californiano'), ('Nueva Zelanda'), ('Flemish Giant'), ('Mestizo')
) AS b(name)
WHERE s.name = 'Conejo'
ON CONFLICT (species_id, name) DO NOTHING;

-- Hámster
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Sirio/Dorado'), ('Ruso/Enano Campbell'), ('Roborovski'), ('Chino')
) AS b(name)
WHERE s.name = 'Hámster'
ON CONFLICT (species_id, name) DO NOTHING;

-- Ave (si existe)
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Periquito'), ('Agapornis'), ('Cacatúa'), ('Loro Amazónico'),
  ('Cotorra'), ('Canario'), ('Guacamaya'), ('Ninfa/Cockatiel')
) AS b(name)
WHERE s.name IN ('Ave', 'Pájaro', 'Aves')
ON CONFLICT (species_id, name) DO NOTHING;
