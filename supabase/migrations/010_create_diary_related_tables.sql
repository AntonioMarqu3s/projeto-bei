-- Criar tabelas relacionadas aos diários que estavam faltando

-- Tabela de pessoas externas
CREATE TABLE IF NOT EXISTS external_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    contact VARCHAR(255),
    company VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de atividades dos diários
CREATE TABLE IF NOT EXISTS diary_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diary_id UUID NOT NULL,
    equipment VARCHAR(255) NOT NULL,
    activity TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    ss_number VARCHAR(100),
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE
);

-- Tabela de usuários participantes dos diários
CREATE TABLE IF NOT EXISTS diary_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diary_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'participant' CHECK (role IN ('creator', 'participant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(diary_id, user_id)
);

-- Tabela de relacionamento entre diários e pessoas externas
CREATE TABLE IF NOT EXISTS diary_external_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diary_id UUID NOT NULL,
    external_person_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (diary_id) REFERENCES diaries(id) ON DELETE CASCADE,
    FOREIGN KEY (external_person_id) REFERENCES external_people(id) ON DELETE CASCADE,
    UNIQUE(diary_id, external_person_id)
);

-- Modificar a tabela diaries para remover campos que agora estão em diary_activities
-- e adicionar campos que faltam
ALTER TABLE diaries DROP COLUMN IF EXISTS equipment;
ALTER TABLE diaries DROP COLUMN IF EXISTS activity;
ALTER TABLE diaries DROP COLUMN IF EXISTS ss;
ALTER TABLE diaries DROP COLUMN IF EXISTS scheduled_time;
ALTER TABLE diaries DROP COLUMN IF EXISTS notes;

-- Adicionar campos que faltam na tabela diaries
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS general_observations TEXT;
ALTER TABLE diaries ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Habilitar RLS nas novas tabelas
ALTER TABLE external_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_external_people ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para external_people
CREATE POLICY "Users can view external people" ON external_people
FOR SELECT USING (true); -- Pessoas externas podem ser vistas por todos

CREATE POLICY "Users can create external people" ON external_people
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update external people" ON external_people
FOR UPDATE USING (true);

CREATE POLICY "Users can delete external people" ON external_people
FOR DELETE USING (true);

-- Políticas RLS para diary_activities
CREATE POLICY "Users can view diary activities from their cluster" ON diary_activities
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM diaries d, users u
    WHERE d.id = diary_activities.diary_id
    AND u.id = auth.uid()
    AND (u.role = 'admin' OR u.cluster_id = d.cluster_id)
  )
);

CREATE POLICY "Users can create diary activities" ON diary_activities
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_activities.diary_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their diary activities" ON diary_activities
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_activities.diary_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their diary activities" ON diary_activities
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_activities.diary_id
    AND d.user_id = auth.uid()
  )
);

-- Políticas RLS para diary_users
CREATE POLICY "Users can view diary participants from their cluster" ON diary_users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM diaries d, users u
    WHERE d.id = diary_users.diary_id
    AND u.id = auth.uid()
    AND (u.role = 'admin' OR u.cluster_id = d.cluster_id)
  )
);

CREATE POLICY "Users can create diary participants" ON diary_users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_users.diary_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update diary participants" ON diary_users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_users.diary_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete diary participants" ON diary_users
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_users.diary_id
    AND d.user_id = auth.uid()
  )
);

-- Políticas RLS para diary_external_people
CREATE POLICY "Users can view diary external people from their cluster" ON diary_external_people
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM diaries d, users u
    WHERE d.id = diary_external_people.diary_id
    AND u.id = auth.uid()
    AND (u.role = 'admin' OR u.cluster_id = d.cluster_id)
  )
);

CREATE POLICY "Users can create diary external people" ON diary_external_people
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_external_people.diary_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update diary external people" ON diary_external_people
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_external_people.diary_id
    AND d.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete diary external people" ON diary_external_people
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM diaries d
    WHERE d.id = diary_external_people.diary_id
    AND d.user_id = auth.uid()
  )
);