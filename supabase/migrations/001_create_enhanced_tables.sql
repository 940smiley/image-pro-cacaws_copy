-- Create processing_history table
CREATE TABLE IF NOT EXISTS processing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    original_filename TEXT NOT NULL,
    new_filename TEXT,
    analysis JSONB,
    operations JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ebay_listings table
CREATE TABLE IF NOT EXISTS ebay_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    processing_result_id UUID REFERENCES processing_history(id),
    item_id TEXT,
    title TEXT,
    description TEXT,
    category TEXT,
    price NUMERIC,
    condition TEXT,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    fees JSONB,
    item_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create facebook_posts table
CREATE TABLE IF NOT EXISTS facebook_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    processing_result_id UUID REFERENCES processing_history(id),
    post_id TEXT,
    page_id TEXT,
    page_name TEXT,
    message TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'draft',
    post_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_provider_configs table
CREATE TABLE IF NOT EXISTS ai_provider_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    provider_name TEXT NOT NULL,
    api_key_encrypted TEXT,
    model_name TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create export_templates table
CREATE TABLE IF NOT EXISTS export_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    format_type TEXT NOT NULL, -- 'json', 'pdf', 'csv', 'xlsx'
    template_config JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create collectible_catalogs table
CREATE TABLE IF NOT EXISTS collectible_catalogs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL, -- 'stamp', 'trading-card', 'postcard', 'war-letter', etc.
    era TEXT,
    country TEXT,
    year INTEGER,
    denomination TEXT,
    condition TEXT,
    rarity TEXT,
    estimated_value_min NUMERIC,
    estimated_value_max NUMERIC,
    authentication_markers TEXT[],
    special_features TEXT[],
    historical_significance TEXT,
    catalog_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_processing_history_user_id ON processing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ebay_listings_user_id ON ebay_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_user_id ON facebook_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_user_id ON ai_provider_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_templates_user_id ON export_templates(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own processing history" ON processing_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing history" ON processing_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing history" ON processing_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processing history" ON processing_history
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own eBay listings" ON ebay_listings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own eBay listings" ON ebay_listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own eBay listings" ON ebay_listings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own eBay listings" ON ebay_listings
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own Facebook posts" ON facebook_posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Facebook posts" ON facebook_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Facebook posts" ON facebook_posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Facebook posts" ON facebook_posts
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI provider configs" ON ai_provider_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI provider configs" ON ai_provider_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI provider configs" ON ai_provider_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI provider configs" ON ai_provider_configs
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own export templates" ON export_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export templates" ON export_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export templates" ON export_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own export templates" ON export_templates
    FOR DELETE USING (auth.uid() = user_id);