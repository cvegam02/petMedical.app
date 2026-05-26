-- Seed: razas comunes
-- Perro (buscar UUID de 'Perro')
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Labrador Retriever'), ('Golden Retriever'), ('Bulldog'), ('Pastor Alemán'),
  ('Caniche/Poodle'), ('Chihuahua'), ('Beagle'), ('Yorkshire Terrier'),
  ('Shih Tzu'), ('Boxer'), ('Schnauzer'), ('Dálmata'), ('Mestizo')
) AS b(name)
WHERE s.name = 'Perro'
ON CONFLICT (species_id, name) DO NOTHING;

-- Gato
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Siamés'), ('Persa'), ('Maine Coon'), ('Bengalí'), ('Ragdoll'),
  ('Angora'), ('Abisinio'), ('British Shorthair'), ('Mestizo')
) AS b(name)
WHERE s.name = 'Gato'
ON CONFLICT (species_id, name) DO NOTHING;

-- Conejo
INSERT INTO breeds (species_id, name)
SELECT s.id, b.name
FROM species s, (VALUES
  ('Holland Lop'), ('Mini Rex'), ('Angora Inglés'), ('Cabeza de León'), ('Mestizo')
) AS b(name)
WHERE s.name = 'Conejo'
ON CONFLICT (species_id, name) DO NOTHING;
