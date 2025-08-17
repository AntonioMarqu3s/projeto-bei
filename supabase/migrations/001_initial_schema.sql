-- Criação das tabelas principais do sistema de diário de atividades

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'cluster_manager', 'technician', 'maintainer')),
    cluster_id UUID,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clusters
CREATE TABLE clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de usinas
CREATE TABLE plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cluster_id UUID NOT NULL,
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE
);

-- Tabela de diários
CREATE TABLE diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    cluster_id UUID NOT NULL,
    plant_id UUID NOT NULL,
    equipment VARCHAR(255) NOT NULL,
    activity TEXT NOT NULL,
    ss VARCHAR(100),
    scheduled_time TIME NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE,
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

-- Tabela de equipes
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cluster_id UUID NOT NULL,
    leader_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE CASCADE,
    FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabela de relacionamento entre equipes e usuários
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id)
);

-- Tabela de manutenções programadas
CREATE TABLE maintenances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plant_id UUID NOT NULL,
    team_id UUID NOT NULL,
    equipment VARCHAR(255) NOT NULL,
    activity TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    estimated_hours INTEGER,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Adicionar chave estrangeira para cluster_id na tabela users
ALTER TABLE users ADD FOREIGN KEY (cluster_id) REFERENCES clusters(id) ON DELETE SET NULL;

-- Habilitar RLS (Row Level Security) em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'admin'
        )
    );

CREATE POLICY "Cluster managers can view users in their cluster" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'cluster_manager'
            AND u.cluster_id = users.cluster_id
        )
    );

-- Políticas RLS para clusters
CREATE POLICY "Users can view their cluster" ON clusters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.cluster_id = clusters.id
        )
    );

CREATE POLICY "Admins can view all clusters" ON clusters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'admin'
        )
    );

-- Políticas RLS para usinas
CREATE POLICY "Users can view plants in their cluster" ON plants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.cluster_id = plants.cluster_id
        )
    );

-- Políticas RLS para diários
CREATE POLICY "Users can view diaries in their cluster" ON diaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.cluster_id = diaries.cluster_id
        )
    );

CREATE POLICY "Users can create their own diaries" ON diaries
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text
    );

CREATE POLICY "Users can update their own diaries" ON diaries
    FOR UPDATE USING (
        auth.uid()::text = user_id::text
    );

-- Políticas RLS para equipes
CREATE POLICY "Users can view teams in their cluster" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.cluster_id = teams.cluster_id
        )
    );

-- Políticas RLS para membros de equipe
CREATE POLICY "Users can view team members in their cluster" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u, teams t 
            WHERE u.id::text = auth.uid()::text 
            AND t.id = team_members.team_id
            AND u.cluster_id = t.cluster_id
        )
    );

-- Políticas RLS para manutenções
CREATE POLICY "Users can view maintenances in their cluster" ON maintenances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u, plants p 
            WHERE u.id::text = auth.uid()::text 
            AND p.id = maintenances.plant_id
            AND u.cluster_id = p.cluster_id
        )
    );

-- Conceder permissões básicas para roles anon e authenticated
GRANT SELECT ON users TO anon, authenticated;
GRANT SELECT ON clusters TO anon, authenticated;
GRANT SELECT ON plants TO anon, authenticated;
GRANT ALL PRIVILEGES ON diaries TO authenticated;
GRANT SELECT ON teams TO anon, authenticated;
GRANT SELECT ON team_members TO anon, authenticated;
GRANT SELECT ON maintenances TO anon, authenticated;

-- Inserir dados iniciais
INSERT INTO clusters (id, name, description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Cluster Norte', 'Cluster responsável pelas usinas da região Norte'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Cluster Sul', 'Cluster responsável pelas usinas da região Sul'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Cluster Leste', 'Cluster responsável pelas usinas da região Leste');

-- Inserir usuário administrador inicial
INSERT INTO users (id, email, name, role, cluster_id) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'admin@sistema.com', 'Administrador', 'admin', NULL);

-- Inserir algumas usinas de exemplo
INSERT INTO plants (name, cluster_id, location, description) VALUES 
    ('Usina Hidrelétrica Norte 1', '550e8400-e29b-41d4-a716-446655440001', 'Rio Grande do Norte', 'Principal usina do cluster Norte'),
    ('Usina Eólica Sul 1', '550e8400-e29b-41d4-a716-446655440002', 'Rio Grande do Sul', 'Parque eólico principal do cluster Sul'),
    ('Usina Solar Leste 1', '550e8400-e29b-41d4-a716-446655440003', 'Minas Gerais', 'Usina solar principal do cluster Leste');