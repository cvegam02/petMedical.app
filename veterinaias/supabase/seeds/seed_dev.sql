-- ============================================================
-- VeterinaIAs — Seed de Datos de Prueba
-- Contraseña de todos los usuarios: Test1234!
-- Re-ejecutable (idempotente)
-- ============================================================
--
-- UUIDs fijos por entidad:
--   Tenants:     a1a1a1a1-0001-4000-a000-0000000000XX
--   Usuarios:    b2b2b2b2-0002-4000-a000-0000000000XX
--   Dueños:      c3c3c3c3-0003-4000-a000-0000000000XX
--   Mascotas:    d4d4d4d4-0004-4000-a000-0000000000XX
--   Expedientes: e5e5e5e5-0005-4000-a000-0000000000XX
--   Citas:       f6f6f6f6-0006-4000-a000-0000000000XX
--   Recetas:     a7a7a7a7-0007-4000-a000-0000000000XX
-- ============================================================

-- ============================================================
-- LIMPIEZA (orden correcto para respetar FK constraints)
-- ============================================================

-- Nullificar referencias circulares en citas antes de borrar expedientes
UPDATE appointments
SET medical_record_id = NULL, origin_record_id = NULL
WHERE id IN (
  'f6f6f6f6-0006-4000-a000-000000000001',
  'f6f6f6f6-0006-4000-a000-000000000002',
  'f6f6f6f6-0006-4000-a000-000000000003',
  'f6f6f6f6-0006-4000-a000-000000000004',
  'f6f6f6f6-0006-4000-a000-000000000005',
  'f6f6f6f6-0006-4000-a000-000000000006',
  'f6f6f6f6-0006-4000-a000-000000000007',
  'f6f6f6f6-0006-4000-a000-000000000008',
  'f6f6f6f6-0006-4000-a000-000000000009',
  'f6f6f6f6-0006-4000-a000-000000000010',
  'f6f6f6f6-0006-4000-a000-000000000011',
  'f6f6f6f6-0006-4000-a000-000000000012'
);

DELETE FROM appointments WHERE id IN (
  'f6f6f6f6-0006-4000-a000-000000000001',
  'f6f6f6f6-0006-4000-a000-000000000002',
  'f6f6f6f6-0006-4000-a000-000000000003',
  'f6f6f6f6-0006-4000-a000-000000000004',
  'f6f6f6f6-0006-4000-a000-000000000005',
  'f6f6f6f6-0006-4000-a000-000000000006',
  'f6f6f6f6-0006-4000-a000-000000000007',
  'f6f6f6f6-0006-4000-a000-000000000008',
  'f6f6f6f6-0006-4000-a000-000000000009',
  'f6f6f6f6-0006-4000-a000-000000000010',
  'f6f6f6f6-0006-4000-a000-000000000011',
  'f6f6f6f6-0006-4000-a000-000000000012'
);

DELETE FROM addendums WHERE medical_record_id IN (
  'e5e5e5e5-0005-4000-a000-000000000001',
  'e5e5e5e5-0005-4000-a000-000000000002',
  'e5e5e5e5-0005-4000-a000-000000000003',
  'e5e5e5e5-0005-4000-a000-000000000004',
  'e5e5e5e5-0005-4000-a000-000000000005',
  'e5e5e5e5-0005-4000-a000-000000000006',
  'e5e5e5e5-0005-4000-a000-000000000007',
  'e5e5e5e5-0005-4000-a000-000000000008'
);

DELETE FROM attachments WHERE medical_record_id IN (
  'e5e5e5e5-0005-4000-a000-000000000001',
  'e5e5e5e5-0005-4000-a000-000000000002',
  'e5e5e5e5-0005-4000-a000-000000000003',
  'e5e5e5e5-0005-4000-a000-000000000004',
  'e5e5e5e5-0005-4000-a000-000000000005',
  'e5e5e5e5-0005-4000-a000-000000000006',
  'e5e5e5e5-0005-4000-a000-000000000007',
  'e5e5e5e5-0005-4000-a000-000000000008'
);

DELETE FROM prescriptions WHERE medical_record_id IN (
  'e5e5e5e5-0005-4000-a000-000000000001',
  'e5e5e5e5-0005-4000-a000-000000000002',
  'e5e5e5e5-0005-4000-a000-000000000003',
  'e5e5e5e5-0005-4000-a000-000000000004',
  'e5e5e5e5-0005-4000-a000-000000000005',
  'e5e5e5e5-0005-4000-a000-000000000006',
  'e5e5e5e5-0005-4000-a000-000000000007',
  'e5e5e5e5-0005-4000-a000-000000000008'
);

DELETE FROM share_tokens WHERE pet_id IN (
  'd4d4d4d4-0004-4000-a000-000000000001',
  'd4d4d4d4-0004-4000-a000-000000000002',
  'd4d4d4d4-0004-4000-a000-000000000003',
  'd4d4d4d4-0004-4000-a000-000000000004',
  'd4d4d4d4-0004-4000-a000-000000000005',
  'd4d4d4d4-0004-4000-a000-000000000006',
  'd4d4d4d4-0004-4000-a000-000000000007',
  'd4d4d4d4-0004-4000-a000-000000000008',
  'd4d4d4d4-0004-4000-a000-000000000009',
  'd4d4d4d4-0004-4000-a000-000000000010'
);

DELETE FROM medical_records WHERE id IN (
  'e5e5e5e5-0005-4000-a000-000000000001',
  'e5e5e5e5-0005-4000-a000-000000000002',
  'e5e5e5e5-0005-4000-a000-000000000003',
  'e5e5e5e5-0005-4000-a000-000000000004',
  'e5e5e5e5-0005-4000-a000-000000000005',
  'e5e5e5e5-0005-4000-a000-000000000006',
  'e5e5e5e5-0005-4000-a000-000000000007',
  'e5e5e5e5-0005-4000-a000-000000000008'
);

DELETE FROM pets WHERE id IN (
  'd4d4d4d4-0004-4000-a000-000000000001',
  'd4d4d4d4-0004-4000-a000-000000000002',
  'd4d4d4d4-0004-4000-a000-000000000003',
  'd4d4d4d4-0004-4000-a000-000000000004',
  'd4d4d4d4-0004-4000-a000-000000000005',
  'd4d4d4d4-0004-4000-a000-000000000006',
  'd4d4d4d4-0004-4000-a000-000000000007',
  'd4d4d4d4-0004-4000-a000-000000000008',
  'd4d4d4d4-0004-4000-a000-000000000009',
  'd4d4d4d4-0004-4000-a000-000000000010'
);

DELETE FROM owners WHERE id IN (
  'c3c3c3c3-0003-4000-a000-000000000001',
  'c3c3c3c3-0003-4000-a000-000000000002',
  'c3c3c3c3-0003-4000-a000-000000000003',
  'c3c3c3c3-0003-4000-a000-000000000004',
  'c3c3c3c3-0003-4000-a000-000000000005',
  'c3c3c3c3-0003-4000-a000-000000000006'
);

DELETE FROM invitations WHERE tenant_id IN (
  'a1a1a1a1-0001-4000-a000-000000000001',
  'a1a1a1a1-0001-4000-a000-000000000002'
);

DELETE FROM auth.users WHERE id IN (
  'b2b2b2b2-0002-4000-a000-000000000001',
  'b2b2b2b2-0002-4000-a000-000000000002',
  'b2b2b2b2-0002-4000-a000-000000000003',
  'b2b2b2b2-0002-4000-a000-000000000004',
  'b2b2b2b2-0002-4000-a000-000000000005',
  'b2b2b2b2-0002-4000-a000-000000000006'
);

DELETE FROM tenants WHERE id IN (
  'a1a1a1a1-0001-4000-a000-000000000001',
  'a1a1a1a1-0001-4000-a000-000000000002'
);


-- ============================================================
-- TENANTS
-- ============================================================
INSERT INTO tenants (id, name, slug, type, subscription_status, trial_ends_at) VALUES
  (
    'a1a1a1a1-0001-4000-a000-000000000001',
    'Clínica San Mateo',
    'clinica-san-mateo',
    'individual',
    'active',
    NOW() + INTERVAL '30 days'
  ),
  (
    'a1a1a1a1-0001-4000-a000-000000000002',
    'Hospital Veterinario Paws',
    'hospital-paws',
    'enterprise',
    'active',
    NOW() + INTERVAL '30 days'
  );


-- ============================================================
-- AUTH USERS (el trigger on_auth_user_created crea user_profiles)
-- ============================================================
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
VALUES
  -- 1. Super Admin
  (
    '00000000-0000-0000-0000-000000000000',
    'b2b2b2b2-0002-4000-a000-000000000001',
    'authenticated', 'authenticated',
    'superadmin@test.veterinaias.dev',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Super Admin Test"}'::jsonb,
    NOW(), NOW()
  ),
  -- 2. Admin — Clínica San Mateo (individual)
  (
    '00000000-0000-0000-0000-000000000000',
    'b2b2b2b2-0002-4000-a000-000000000002',
    'authenticated', 'authenticated',
    'admin.individual@test.veterinaias.dev',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ana López"}'::jsonb,
    NOW(), NOW()
  ),
  -- 3. Staff — Clínica San Mateo (individual)
  (
    '00000000-0000-0000-0000-000000000000',
    'b2b2b2b2-0002-4000-a000-000000000003',
    'authenticated', 'authenticated',
    'staff@test.veterinaias.dev',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Marco Torres"}'::jsonb,
    NOW(), NOW()
  ),
  -- 4. Admin — Hospital Veterinario Paws (enterprise)
  (
    '00000000-0000-0000-0000-000000000000',
    'b2b2b2b2-0002-4000-a000-000000000004',
    'authenticated', 'authenticated',
    'admin.empresa@test.veterinaias.dev',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dra. Sofía Hernández"}'::jsonb,
    NOW(), NOW()
  ),
  -- 5. Doctor — Hospital Veterinario Paws (enterprise)
  (
    '00000000-0000-0000-0000-000000000000',
    'b2b2b2b2-0002-4000-a000-000000000005',
    'authenticated', 'authenticated',
    'doctor@test.veterinaias.dev',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dr. Rodrigo Méndez"}'::jsonb,
    NOW(), NOW()
  ),
  -- 6. Assistant — Hospital Veterinario Paws (enterprise)
  (
    '00000000-0000-0000-0000-000000000000',
    'b2b2b2b2-0002-4000-a000-000000000006',
    'authenticated', 'authenticated',
    'assistant@test.veterinaias.dev',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Valentina Cruz"}'::jsonb,
    NOW(), NOW()
  );


-- ============================================================
-- USER PROFILES — actualizar roles y tenant (trigger ya los creó)
-- ============================================================
UPDATE user_profiles SET
  is_super_admin = TRUE,
  full_name = 'Super Admin Test'
WHERE id = 'b2b2b2b2-0002-4000-a000-000000000001';

UPDATE user_profiles SET
  tenant_id = 'a1a1a1a1-0001-4000-a000-000000000001',
  role = 'admin',
  full_name = 'Ana López'
WHERE id = 'b2b2b2b2-0002-4000-a000-000000000002';

UPDATE user_profiles SET
  tenant_id = 'a1a1a1a1-0001-4000-a000-000000000001',
  role = 'staff',
  full_name = 'Marco Torres'
WHERE id = 'b2b2b2b2-0002-4000-a000-000000000003';

UPDATE user_profiles SET
  tenant_id = 'a1a1a1a1-0001-4000-a000-000000000002',
  role = 'admin',
  full_name = 'Dra. Sofía Hernández'
WHERE id = 'b2b2b2b2-0002-4000-a000-000000000004';

UPDATE user_profiles SET
  tenant_id = 'a1a1a1a1-0001-4000-a000-000000000002',
  role = 'doctor',
  full_name = 'Dr. Rodrigo Méndez'
WHERE id = 'b2b2b2b2-0002-4000-a000-000000000005';

UPDATE user_profiles SET
  tenant_id = 'a1a1a1a1-0001-4000-a000-000000000002',
  role = 'assistant',
  full_name = 'Valentina Cruz'
WHERE id = 'b2b2b2b2-0002-4000-a000-000000000006';


-- ============================================================
-- DUEÑOS (nivel plataforma, sin tenant_id)
-- ============================================================
INSERT INTO owners (id, full_name, email, phone, address) VALUES
  ('c3c3c3c3-0003-4000-a000-000000000001', 'Carlos Ramírez',   'carlos.ramirez@example.com',  '555-0101', 'Av. Insurgentes Sur 123, CDMX'),
  ('c3c3c3c3-0003-4000-a000-000000000002', 'María González',   'maria.gonzalez@example.com',  '555-0202', 'Calle Madero 456, Guadalajara'),
  ('c3c3c3c3-0003-4000-a000-000000000003', 'Roberto Jiménez',  'roberto.jimenez@example.com', '555-0303', 'Blvd. Kukulcán 789, Cancún'),
  ('c3c3c3c3-0003-4000-a000-000000000004', 'Lucía Morales',    'lucia.morales@example.com',   '555-0404', 'Av. Juárez 321, Monterrey'),
  ('c3c3c3c3-0003-4000-a000-000000000005', 'Fernando Ruiz',    'fernando.ruiz@example.com',   '555-0505', 'Calle Hidalgo 654, Puebla'),
  ('c3c3c3c3-0003-4000-a000-000000000006', 'Patricia Vega',    'patricia.vega@example.com',   '555-0606', 'Av. Reforma 987, CDMX');


-- ============================================================
-- MASCOTAS (nivel plataforma)
-- Nota: breed_id via subquery por nombre (nullable si no existe)
-- ============================================================
INSERT INTO pets (id, owner_id, name, species_id, breed_id, sex, date_of_birth, color) VALUES
  -- Carlos Ramírez → 2 mascotas
  (
    'd4d4d4d4-0004-4000-a000-000000000001',
    'c3c3c3c3-0003-4000-a000-000000000001',
    'Max',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Labrador Retriever' LIMIT 1),
    'male', '2020-03-15', 'Dorado'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000002',
    'c3c3c3c3-0003-4000-a000-000000000001',
    'Luna',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Golden Retriever' LIMIT 1),
    'female', '2021-07-20', 'Dorado claro'
  ),
  -- María González → 2 mascotas
  (
    'd4d4d4d4-0004-4000-a000-000000000003',
    'c3c3c3c3-0003-4000-a000-000000000002',
    'Misifú',
    (SELECT id FROM species WHERE name = 'Gato'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Gato' AND b.name = 'Persa' LIMIT 1),
    'male', '2019-11-05', 'Blanco'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000009',
    'c3c3c3c3-0003-4000-a000-000000000002',
    'Buddy',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Beagle' LIMIT 1),
    'male', '2022-01-10', 'Tricolor'
  ),
  -- Roberto Jiménez → 2 mascotas
  (
    'd4d4d4d4-0004-4000-a000-000000000004',
    'c3c3c3c3-0003-4000-a000-000000000003',
    'Tobías',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Mestizo' LIMIT 1),
    'male', '2018-06-30', 'Café y blanco'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000010',
    'c3c3c3c3-0003-4000-a000-000000000003',
    'Lola',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Chihuahua' LIMIT 1),
    'female', '2023-04-18', 'Negro'
  ),
  -- Lucía Morales → 2 mascotas
  (
    'd4d4d4d4-0004-4000-a000-000000000005',
    'c3c3c3c3-0003-4000-a000-000000000004',
    'Nala',
    (SELECT id FROM species WHERE name = 'Gato'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Gato' AND b.name = 'Siamés' LIMIT 1),
    'female', '2020-09-12', 'Crema y chocolate'
  ),
  (
    'd4d4d4d4-0004-4000-a000-000000000006',
    'c3c3c3c3-0003-4000-a000-000000000004',
    'Copito',
    (SELECT id FROM species WHERE name = 'Conejo'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Conejo' AND b.name = 'Holland Lop' LIMIT 1),
    'male', '2022-12-01', 'Blanco'
  ),
  -- Fernando Ruiz → 1 mascota
  (
    'd4d4d4d4-0004-4000-a000-000000000007',
    'c3c3c3c3-0003-4000-a000-000000000005',
    'Rocky',
    (SELECT id FROM species WHERE name = 'Perro'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Perro' AND b.name = 'Pastor Alemán' LIMIT 1),
    'male', '2019-02-28', 'Negro y café'
  ),
  -- Patricia Vega → 1 mascota
  (
    'd4d4d4d4-0004-4000-a000-000000000008',
    'c3c3c3c3-0003-4000-a000-000000000006',
    'Canela',
    (SELECT id FROM species WHERE name = 'Gato'),
    (SELECT b.id FROM breeds b JOIN species s ON b.species_id = s.id WHERE s.name = 'Gato' AND b.name = 'Maine Coon' LIMIT 1),
    'female', '2021-05-22', 'Anaranjado'
  );


-- ============================================================
-- EXPEDIENTES CLÍNICOS (inmutables — sin UPDATE)
-- 4 para San Mateo, 4 para Hospital Paws
-- appointment_id se actualiza después de insertar citas
-- ============================================================
INSERT INTO medical_records (
  id, pet_id, tenant_id, created_by,
  reason, diagnosis, treatment, notes,
  weight_kg, temperature_celsius, heart_rate_bpm, respiratory_rate_bpm,
  created_at
) VALUES
  -- San Mateo: creados por Ana López (admin.individual)
  (
    'e5e5e5e5-0005-4000-a000-000000000001',
    'd4d4d4d4-0004-4000-a000-000000000001', -- Max
    'a1a1a1a1-0001-4000-a000-000000000001', -- San Mateo
    'b2b2b2b2-0002-4000-a000-000000000002', -- Ana López (admin)
    'Consulta de rutina anual',
    'Paciente en buen estado general. Sin hallazgos significativos.',
    'Vacunas al día. Desparasitación interna y externa.',
    'Propietario comenta aumento de apetito en el último mes.',
    28.5, 38.4, 96, 22,
    NOW() - INTERVAL '14 days'
  ),
  (
    'e5e5e5e5-0005-4000-a000-000000000002',
    'd4d4d4d4-0004-4000-a000-000000000002', -- Luna
    'a1a1a1a1-0001-4000-a000-000000000001', -- San Mateo
    'b2b2b2b2-0002-4000-a000-000000000002', -- Ana López (admin)
    'Vacunación anual',
    'Paciente sana. Peso adecuado para su edad y raza.',
    'Aplicación de vacuna polivalente y antirrábica.',
    NULL,
    22.0, 38.6, 88, 20,
    NOW() - INTERVAL '30 days'
  ),
  -- San Mateo: creado por Marco Torres (staff)
  (
    'e5e5e5e5-0005-4000-a000-000000000003',
    'd4d4d4d4-0004-4000-a000-000000000003', -- Misifú
    'a1a1a1a1-0001-4000-a000-000000000001', -- San Mateo
    'b2b2b2b2-0002-4000-a000-000000000003', -- Marco Torres (staff)
    'Infección respiratoria alta',
    'Rinotraqueitis felina. Descarga nasal mucopurulenta bilateral.',
    'Amoxicilina 50mg/kg PO c/12h por 10 días. Reposo y aislamiento de otros felinos.',
    'Paciente con historial de episodios recurrentes. Revisar en 10 días.',
    4.2, 39.1, 180, 36,
    NOW() - INTERVAL '7 days'
  ),
  -- San Mateo: control post-cirugía, creado por Ana López
  (
    'e5e5e5e5-0005-4000-a000-000000000004',
    'd4d4d4d4-0004-4000-a000-000000000004', -- Tobías
    'a1a1a1a1-0001-4000-a000-000000000001', -- San Mateo
    'b2b2b2b2-0002-4000-a000-000000000002', -- Ana López (admin)
    'Control post-operatorio — esterilización',
    'Herida quirúrgica en buenas condiciones. Sin signos de infección.',
    'Retirar puntos en 5 días. Continuar con antibiótico prescrito.',
    'Cirugía realizada hace 7 días sin complicaciones.',
    18.3, 38.3, 92, 18,
    NOW() - INTERVAL '7 days'
  ),
  -- Hospital Paws: creados por Dr. Rodrigo Méndez (doctor)
  (
    'e5e5e5e5-0005-4000-a000-000000000005',
    'd4d4d4d4-0004-4000-a000-000000000007', -- Rocky
    'a1a1a1a1-0001-4000-a000-000000000002', -- Hospital Paws
    'b2b2b2b2-0002-4000-a000-000000000005', -- Dr. Rodrigo (doctor)
    'Chequeo general anual',
    'Animal en excelente condición física. Dentición con sarro moderado.',
    'Limpieza dental programada para próxima consulta. Vacunas actualizadas.',
    'Recomendación de dieta para control de peso.',
    35.0, 38.5, 80, 16,
    NOW() - INTERVAL '20 days'
  ),
  (
    'e5e5e5e5-0005-4000-a000-000000000006',
    'd4d4d4d4-0004-4000-a000-000000000008', -- Canela
    'a1a1a1a1-0001-4000-a000-000000000002', -- Hospital Paws
    'b2b2b2b2-0002-4000-a000-000000000005', -- Dr. Rodrigo (doctor)
    'Dermatitis alérgica',
    'Dermatitis atópica con pododermatitis secundaria. Prueba de alergia sugerida.',
    'Ciprofloxacino 5mg/kg c/12h por 14 días. Prednisona 1mg/kg c/24h por 7 días tapering.',
    'Recomendado baño semanal con shampoo hipoalergénico.',
    4.8, 38.7, 172, 30,
    NOW() - INTERVAL '10 days'
  ),
  (
    'e5e5e5e5-0005-4000-a000-000000000007',
    'd4d4d4d4-0004-4000-a000-000000000005', -- Nala
    'a1a1a1a1-0001-4000-a000-000000000002', -- Hospital Paws
    'b2b2b2b2-0002-4000-a000-000000000005', -- Dr. Rodrigo (doctor)
    'Esterilización (ovariohisterectomía)',
    'Paciente estabilizada post-cirugía. Sin complicaciones.',
    'Meloxicam 0.1mg/kg c/24h por 3 días. Isoxazolina como antiparasitario.',
    'Revisión de sutura en 10 días.',
    3.9, 38.0, 160, 24,
    NOW() - INTERVAL '5 days'
  ),
  -- Hospital Paws: creado por Dra. Sofía Hernández (admin.empresa)
  (
    'e5e5e5e5-0005-4000-a000-000000000008',
    'd4d4d4d4-0004-4000-a000-000000000009', -- Buddy
    'a1a1a1a1-0001-4000-a000-000000000002', -- Hospital Paws
    'b2b2b2b2-0002-4000-a000-000000000004', -- Dra. Sofía (admin)
    'Gastroenteritis aguda',
    'Gastroenteritis por ingesta de alimento inadecuado. Deshidratación leve.',
    'Suero oral. Dieta blanda 5 días. Metronidazol 15mg/kg c/12h por 5 días.',
    'Propietario advirtió que el perro encontró comida en la basura.',
    11.5, 39.0, 104, 24,
    NOW() - INTERVAL '3 days'
  );


-- ============================================================
-- PRESCRIPCIONES (para expedientes 3 y 6)
-- ============================================================
INSERT INTO prescriptions (id, medical_record_id, medication_name, dosage, frequency, duration, notes) VALUES
  -- Expediente 3: Misifú (infección respiratoria)
  (
    'a7a7a7a7-0007-4000-a000-000000000001',
    'e5e5e5e5-0005-4000-a000-000000000003',
    'Amoxicilina',
    '50mg/kg',
    'Cada 12 horas',
    '10 días',
    'Administrar con alimento para reducir molestias gástricas'
  ),
  -- Expediente 6: Canela (dermatitis) — 2 medicamentos
  (
    'a7a7a7a7-0007-4000-a000-000000000002',
    'e5e5e5e5-0005-4000-a000-000000000006',
    'Ciprofloxacino',
    '5mg/kg',
    'Cada 12 horas',
    '14 días',
    NULL
  ),
  (
    'a7a7a7a7-0007-4000-a000-000000000003',
    'e5e5e5e5-0005-4000-a000-000000000006',
    'Prednisona',
    '1mg/kg (tapering)',
    'Cada 24 horas',
    '7 días con reducción gradual',
    'Días 1-3: dosis completa. Días 4-5: mitad. Días 6-7: cuarto de dosis.'
  );


-- ============================================================
-- CITAS (12 en total: 3 scheduled, 3 confirmed, 3 completed, 2 cancelled, 1 no_show)
-- Las de Hospital Paws tienen assigned_to = doctor
-- ============================================================
INSERT INTO appointments (
  id, tenant_id, pet_id, owner_id, assigned_to, status,
  scheduled_at, duration_minutes, reason, medical_record_id, created_by
) VALUES
  -- ---- CLÍNICA SAN MATEO ----
  -- scheduled (1)
  (
    'f6f6f6f6-0006-4000-a000-000000000001',
    'a1a1a1a1-0001-4000-a000-000000000001',
    'd4d4d4d4-0004-4000-a000-000000000001', -- Max
    'c3c3c3c3-0003-4000-a000-000000000001', -- Carlos Ramírez
    NULL,
    'scheduled',
    NOW() + INTERVAL '7 days',
    30, 'Desparasitación trimestral', NULL,
    'b2b2b2b2-0002-4000-a000-000000000003' -- Marco Torres (staff)
  ),
  -- confirmed (2, 3)
  (
    'f6f6f6f6-0006-4000-a000-000000000002',
    'a1a1a1a1-0001-4000-a000-000000000001',
    'd4d4d4d4-0004-4000-a000-000000000002', -- Luna
    'c3c3c3c3-0003-4000-a000-000000000001', -- Carlos Ramírez
    NULL,
    'confirmed',
    NOW() + INTERVAL '3 days',
    30, 'Revisión de sutura', NULL,
    'b2b2b2b2-0002-4000-a000-000000000002' -- Ana López (admin)
  ),
  (
    'f6f6f6f6-0006-4000-a000-000000000003',
    'a1a1a1a1-0001-4000-a000-000000000001',
    'd4d4d4d4-0004-4000-a000-000000000003', -- Misifú
    'c3c3c3c3-0003-4000-a000-000000000002', -- María González
    NULL,
    'confirmed',
    NOW() + INTERVAL '5 days',
    45, 'Control post-antibióticos', NULL,
    'b2b2b2b2-0002-4000-a000-000000000003' -- Marco Torres (staff)
  ),
  -- completed (4, 5) — vinculadas a expedientes
  (
    'f6f6f6f6-0006-4000-a000-000000000004',
    'a1a1a1a1-0001-4000-a000-000000000001',
    'd4d4d4d4-0004-4000-a000-000000000004', -- Tobías
    'c3c3c3c3-0003-4000-a000-000000000003', -- Roberto Jiménez
    NULL,
    'completed',
    NOW() - INTERVAL '7 days',
    60, 'Control post-cirugía',
    'e5e5e5e5-0005-4000-a000-000000000004', -- Expediente: control post-op
    'b2b2b2b2-0002-4000-a000-000000000002'
  ),
  (
    'f6f6f6f6-0006-4000-a000-000000000005',
    'a1a1a1a1-0001-4000-a000-000000000001',
    'd4d4d4d4-0004-4000-a000-000000000001', -- Max
    'c3c3c3c3-0003-4000-a000-000000000001', -- Carlos Ramírez
    NULL,
    'completed',
    NOW() - INTERVAL '14 days',
    30, 'Consulta de rutina anual',
    'e5e5e5e5-0005-4000-a000-000000000001', -- Expediente: rutina anual Max
    'b2b2b2b2-0002-4000-a000-000000000002'
  ),
  -- cancelled (6)
  (
    'f6f6f6f6-0006-4000-a000-000000000006',
    'a1a1a1a1-0001-4000-a000-000000000001',
    'd4d4d4d4-0004-4000-a000-000000000009', -- Buddy
    'c3c3c3c3-0003-4000-a000-000000000002', -- María González
    NULL,
    'cancelled',
    NOW() - INTERVAL '3 days',
    30, 'Baño y corte de uñas', NULL,
    'b2b2b2b2-0002-4000-a000-000000000003'
  ),
  -- ---- HOSPITAL VETERINARIO PAWS ----
  -- scheduled (7, 10)
  (
    'f6f6f6f6-0006-4000-a000-000000000007',
    'a1a1a1a1-0001-4000-a000-000000000002',
    'd4d4d4d4-0004-4000-a000-000000000007', -- Rocky
    'c3c3c3c3-0003-4000-a000-000000000005', -- Fernando Ruiz
    'b2b2b2b2-0002-4000-a000-000000000005', -- Dr. Rodrigo
    'scheduled',
    NOW() + INTERVAL '10 days',
    60, 'Limpieza dental', NULL,
    'b2b2b2b2-0002-4000-a000-000000000006' -- Valentina (assistant)
  ),
  (
    'f6f6f6f6-0006-4000-a000-000000000010',
    'a1a1a1a1-0001-4000-a000-000000000002',
    'd4d4d4d4-0004-4000-a000-000000000010', -- Lola
    'c3c3c3c3-0003-4000-a000-000000000003', -- Roberto Jiménez
    'b2b2b2b2-0002-4000-a000-000000000006', -- Valentina (assistant)
    'scheduled',
    NOW() + INTERVAL '15 days',
    30, 'Primera consulta', NULL,
    'b2b2b2b2-0002-4000-a000-000000000006'
  ),
  -- confirmed (8)
  (
    'f6f6f6f6-0006-4000-a000-000000000008',
    'a1a1a1a1-0001-4000-a000-000000000002',
    'd4d4d4d4-0004-4000-a000-000000000008', -- Canela
    'c3c3c3c3-0003-4000-a000-000000000006', -- Patricia Vega
    'b2b2b2b2-0002-4000-a000-000000000005', -- Dr. Rodrigo
    'confirmed',
    NOW() + INTERVAL '2 days',
    45, 'Seguimiento dermatitis alérgica', NULL,
    'b2b2b2b2-0002-4000-a000-000000000004' -- Dra. Sofía (admin)
  ),
  -- completed (9) — vinculada a expediente Nala
  (
    'f6f6f6f6-0006-4000-a000-000000000009',
    'a1a1a1a1-0001-4000-a000-000000000002',
    'd4d4d4d4-0004-4000-a000-000000000005', -- Nala
    'c3c3c3c3-0003-4000-a000-000000000004', -- Lucía Morales
    'b2b2b2b2-0002-4000-a000-000000000005', -- Dr. Rodrigo
    'completed',
    NOW() - INTERVAL '5 days',
    90, 'Ovariohisterectomía',
    'e5e5e5e5-0005-4000-a000-000000000007', -- Expediente: esterilización Nala
    'b2b2b2b2-0002-4000-a000-000000000004'
  ),
  -- no_show (11)
  (
    'f6f6f6f6-0006-4000-a000-000000000011',
    'a1a1a1a1-0001-4000-a000-000000000002',
    'd4d4d4d4-0004-4000-a000-000000000007', -- Rocky
    'c3c3c3c3-0003-4000-a000-000000000005', -- Fernando Ruiz
    'b2b2b2b2-0002-4000-a000-000000000005', -- Dr. Rodrigo
    'no_show',
    NOW() - INTERVAL '2 days',
    60, 'Vacunación anual', NULL,
    'b2b2b2b2-0002-4000-a000-000000000006'
  ),
  -- cancelled (12)
  (
    'f6f6f6f6-0006-4000-a000-000000000012',
    'a1a1a1a1-0001-4000-a000-000000000002',
    'd4d4d4d4-0004-4000-a000-000000000006', -- Copito
    'c3c3c3c3-0003-4000-a000-000000000004', -- Lucía Morales
    'b2b2b2b2-0002-4000-a000-000000000005', -- Dr. Rodrigo
    'cancelled',
    NOW() - INTERVAL '1 day',
    30, 'Control de peso', NULL,
    'b2b2b2b2-0002-4000-a000-000000000006'
  );


-- ============================================================
-- Vincular appointment_id en los expedientes correspondientes
-- (appointment_id no tiene FK constraint en medical_records)
-- ============================================================
UPDATE medical_records SET
  appointment_id = 'f6f6f6f6-0006-4000-a000-000000000005'
WHERE id = 'e5e5e5e5-0005-4000-a000-000000000001'; -- Max consulta rutina → cita 5

UPDATE medical_records SET
  appointment_id = 'f6f6f6f6-0006-4000-a000-000000000004'
WHERE id = 'e5e5e5e5-0005-4000-a000-000000000004'; -- Tobías post-op → cita 4

UPDATE medical_records SET
  appointment_id = 'f6f6f6f6-0006-4000-a000-000000000009'
WHERE id = 'e5e5e5e5-0005-4000-a000-000000000007'; -- Nala esterilización → cita 9
