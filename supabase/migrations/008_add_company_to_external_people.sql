-- Adicionar campo empresa para pessoas externas
ALTER TABLE external_people ADD COLUMN company VARCHAR(255);

-- Comentário explicativo
COMMENT ON COLUMN external_people.company IS 'Nome da empresa da pessoa externa';