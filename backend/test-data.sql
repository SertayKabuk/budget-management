-- ============================================================================
-- Budget Management App - Test Data Generation Script
-- ============================================================================
-- This script generates comprehensive fake data for testing purposes
-- Run this script manually against your PostgreSQL database
-- WARNING: This will insert data into existing tables. Use on test/dev databases only!
-- ============================================================================

-- Clear existing data (optional - comment out if you want to preserve existing data)
-- TRUNCATE TABLE "AuditLog", "Payment", "RecurringReminder", "Expense", "GroupMember", "GroupInvite", "Group", "User" CASCADE;

-- ============================================================================
-- 1. USERS (10 sample users)
-- ============================================================================

INSERT INTO "User" (id, name, email, password, "googleId", picture, role, "createdAt", "updatedAt") VALUES
-- Admin user
('550e8400-e29b-41d4-a716-446655440001', 'Admin User', 'admin@budgetapp.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-admin-123', 'https://i.pravatar.cc/150?img=1', 'admin', NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),

-- Regular users
('550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', 'ayse.yilmaz@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-ayse-456', 'https://i.pravatar.cc/150?img=5', 'user', NOW() - INTERVAL '80 days', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440003', 'Mehmet Kaya', 'mehmet.kaya@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-mehmet-789', 'https://i.pravatar.cc/150?img=12', 'user', NOW() - INTERVAL '75 days', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440004', 'Fatma Demir', 'fatma.demir@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-fatma-101', 'https://i.pravatar.cc/150?img=20', 'user', NOW() - INTERVAL '70 days', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440005', 'Ali Çelik', 'ali.celik@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-ali-202', 'https://i.pravatar.cc/150?img=33', 'user', NOW() - INTERVAL '65 days', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440006', 'Zeynep Özdemir', 'zeynep.ozdemir@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-zeynep-303', 'https://i.pravatar.cc/150?img=47', 'user', NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440007', 'Ahmet Şahin', 'ahmet.sahin@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-ahmet-404', 'https://i.pravatar.cc/150?img=52', 'user', NOW() - INTERVAL '55 days', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440008', 'Elif Arslan', 'elif.arslan@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-elif-505', 'https://i.pravatar.cc/150?img=25', 'user', NOW() - INTERVAL '50 days', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440009', 'Burak Aydın', 'burak.aydin@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-burak-606', 'https://i.pravatar.cc/150?img=68', 'user', NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440010', 'Selin Koç', 'selin.koc@example.com', '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', 'google-selin-707', 'https://i.pravatar.cc/150?img=29', 'user', NOW() - INTERVAL '40 days', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 2. GROUPS (5 sample groups)
-- ============================================================================

INSERT INTO "Group" (id, name, description, "createdAt", "updatedAt") VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Ev Arkadaşları', 'Kira ve ortak giderler için grup', NOW() - INTERVAL '80 days', NOW() - INTERVAL '1 day'),
('660e8400-e29b-41d4-a716-446655440002', 'Aile Bütçesi', 'Aile harcamaları takibi', NOW() - INTERVAL '75 days', NOW() - INTERVAL '2 days'),
('660e8400-e29b-41d4-a716-446655440003', 'Ofis Yemek Grubu', 'Öğle yemeği ve kahve harcamaları', NOW() - INTERVAL '70 days', NOW() - INTERVAL '1 day'),
('660e8400-e29b-41d4-a716-446655440004', 'Tatil Planı', '2025 yaz tatili için birikim', NOW() - INTERVAL '60 days', NOW() - INTERVAL '3 days'),
('660e8400-e29b-41d4-a716-446655440005', 'Spor Salonu Grubu', 'Toplu antrenör ve ekipman alımı', NOW() - INTERVAL '50 days', NOW() - INTERVAL '2 days');

-- ============================================================================
-- 3. GROUP MEMBERS (Users assigned to groups with roles)
-- ============================================================================

INSERT INTO "GroupMember" (id, "userId", "groupId", role, "joinedAt") VALUES
-- Ev Arkadaşları (Group 1) - 4 members
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'admin', NOW() - INTERVAL '80 days'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'member', NOW() - INTERVAL '79 days'),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', 'member', NOW() - INTERVAL '78 days'),
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440001', 'member', NOW() - INTERVAL '77 days'),

-- Aile Bütçesi (Group 2) - 3 members
('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'admin', NOW() - INTERVAL '75 days'),
('770e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', 'admin', NOW() - INTERVAL '75 days'),
('770e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440002', 'member', NOW() - INTERVAL '74 days'),

-- Ofis Yemek Grubu (Group 3) - 5 members
('770e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 'admin', NOW() - INTERVAL '70 days'),
('770e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440003', 'member', NOW() - INTERVAL '69 days'),
('770e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003', 'member', NOW() - INTERVAL '68 days'),
('770e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440003', 'member', NOW() - INTERVAL '67 days'),
('770e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440003', 'member', NOW() - INTERVAL '66 days'),

-- Tatil Planı (Group 4) - 4 members
('770e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'admin', NOW() - INTERVAL '60 days'),
('770e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440004', 'member', NOW() - INTERVAL '59 days'),
('770e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440004', 'member', NOW() - INTERVAL '58 days'),
('770e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440004', 'member', NOW() - INTERVAL '57 days'),

-- Spor Salonu Grubu (Group 5) - 3 members
('770e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440005', 'admin', NOW() - INTERVAL '50 days'),
('770e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440005', 'member', NOW() - INTERVAL '49 days'),
('770e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', 'member', NOW() - INTERVAL '48 days');

-- ============================================================================
-- 4. EXPENSES (50+ sample expenses across different groups and categories)
-- ============================================================================

-- Ev Arkadaşları expenses (Group 1)
INSERT INTO "Expense" (id, amount, description, category, date, "userId", "groupId", "createdAt", "updatedAt") VALUES
('880e8400-e29b-41d4-a716-446655440001', 5000.00, 'Kira Ödemesi - Kasım', 'Kira', NOW() - INTERVAL '5 days', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('880e8400-e29b-41d4-a716-446655440002', 850.50, 'Elektrik Faturası', 'Faturalar', NOW() - INTERVAL '10 days', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('880e8400-e29b-41d4-a716-446655440003', 320.75, 'Su Faturası', 'Faturalar', NOW() - INTERVAL '12 days', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),
('880e8400-e29b-41d4-a716-446655440004', 250.00, 'İnternet Faturası', 'Faturalar', NOW() - INTERVAL '15 days', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('880e8400-e29b-41d4-a716-446655440005', 180.00, 'Doğalgaz Faturası', 'Faturalar', NOW() - INTERVAL '8 days', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('880e8400-e29b-41d4-a716-446655440006', 450.00, 'Market Alışverişi', 'Market', NOW() - INTERVAL '3 days', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('880e8400-e29b-41d4-a716-446655440007', 350.00, 'Temizlik Malzemeleri', 'Market', NOW() - INTERVAL '7 days', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('880e8400-e29b-41d4-a716-446655440008', 5000.00, 'Kira Ödemesi - Ekim', 'Kira', NOW() - INTERVAL '35 days', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),
('880e8400-e29b-41d4-a716-446655440009', 780.00, 'Elektrik Faturası - Ekim', 'Faturalar', NOW() - INTERVAL '40 days', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),

-- Aile Bütçesi expenses (Group 2)
('880e8400-e29b-41d4-a716-446655440010', 1200.00, 'Okul Kayıt Ücreti', 'Eğitim', NOW() - INTERVAL '20 days', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('880e8400-e29b-41d4-a716-446655440011', 800.00, 'Aylık Market', 'Market', NOW() - INTERVAL '5 days', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('880e8400-e29b-41d4-a716-446655440012', 350.00, 'Eczane', 'Sağlık', NOW() - INTERVAL '15 days', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('880e8400-e29b-41d4-a716-446655440013', 500.00, 'Doktor Muayenesi', 'Sağlık', NOW() - INTERVAL '18 days', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),
('880e8400-e29b-41d4-a716-446655440014', 2500.00, 'Araba Servisi', 'Ulaşım', NOW() - INTERVAL '25 days', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
('880e8400-e29b-41d4-a716-446655440015', 650.00, 'Benzin', 'Ulaşım', NOW() - INTERVAL '4 days', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('880e8400-e29b-41d4-a716-446655440016', 1500.00, 'Mobilya Alışverişi', 'Ev Eşyaları', NOW() - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('880e8400-e29b-41d4-a716-446655440017', 450.00, 'Çocuk Kıyafetleri', 'Giyim', NOW() - INTERVAL '22 days', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),

-- Ofis Yemek Grubu expenses (Group 3)
('880e8400-e29b-41d4-a716-446655440018', 85.00, 'Öğle Yemeği - Pideci', 'Yemek', NOW() - INTERVAL '1 days', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '1 days', NOW() - INTERVAL '1 days'),
('880e8400-e29b-41d4-a716-446655440019', 120.00, 'Kahve ve Tatlı', 'Kahve', NOW() - INTERVAL '2 days', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('880e8400-e29b-41d4-a716-446655440020', 95.00, 'Dönerci', 'Yemek', NOW() - INTERVAL '3 days', '550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('880e8400-e29b-41d4-a716-446655440021', 150.00, 'Restorant - Çorbacı', 'Yemek', NOW() - INTERVAL '4 days', '550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('880e8400-e29b-41d4-a716-446655440022', 75.00, 'Starbucks', 'Kahve', NOW() - INTERVAL '5 days', '550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('880e8400-e29b-41d4-a716-446655440023', 110.00, 'Pide Salonu', 'Yemek', NOW() - INTERVAL '6 days', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('880e8400-e29b-41d4-a716-446655440024', 200.00, 'Burger King - Ekip Yemeği', 'Yemek', NOW() - INTERVAL '7 days', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
('880e8400-e29b-41d4-a716-446655440025', 65.00, 'Simit Sarayı', 'Kahve', NOW() - INTERVAL '8 days', '550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('880e8400-e29b-41d4-a716-446655440026', 130.00, 'Kebapçı', 'Yemek', NOW() - INTERVAL '9 days', '550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
('880e8400-e29b-41d4-a716-446655440027', 90.00, 'Kahvaltı Yeri', 'Yemek', NOW() - INTERVAL '10 days', '550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

-- Tatil Planı expenses (Group 4)
('880e8400-e29b-41d4-a716-446655440028', 3000.00, 'Uçak Bileti Ön Ödemesi', 'Ulaşım', NOW() - INTERVAL '45 days', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
('880e8400-e29b-41d4-a716-446655440029', 5000.00, 'Otel Rezervasyonu', 'Konaklama', NOW() - INTERVAL '40 days', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),
('880e8400-e29b-41d4-a716-446655440030', 800.00, 'Vize Ücretleri', 'Seyahat', NOW() - INTERVAL '35 days', '550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),
('880e8400-e29b-41d4-a716-446655440031', 1500.00, 'Tur Planlaması', 'Seyahat', NOW() - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('880e8400-e29b-41d4-a716-446655440032', 1200.00, 'Bagaj ve Aksesuarlar', 'Seyahat', NOW() - INTERVAL '20 days', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('880e8400-e29b-41d4-a716-446655440033', 600.00, 'Seyahat Sigortası', 'Seyahat', NOW() - INTERVAL '25 days', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),

-- Spor Salonu Grubu expenses (Group 5)
('880e8400-e29b-41d4-a716-446655440034', 800.00, 'Aylık Antrenör Ücreti', 'Spor', NOW() - INTERVAL '10 days', '550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('880e8400-e29b-41d4-a716-446655440035', 350.00, 'Protein Tozu', 'Spor', NOW() - INTERVAL '15 days', '550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('880e8400-e29b-41d4-a716-446655440036', 450.00, 'Spor Ekipmanı', 'Spor', NOW() - INTERVAL '20 days', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
('880e8400-e29b-41d4-a716-446655440037', 200.00, 'Takviye Besinler', 'Spor', NOW() - INTERVAL '5 days', '550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('880e8400-e29b-41d4-a716-446655440038', 300.00, 'Spor Ayakkabısı', 'Spor', NOW() - INTERVAL '12 days', '550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'),

-- Additional mixed expenses
('880e8400-e29b-41d4-a716-446655440039', 120.00, 'Netflix Aboneliği', 'Eğlence', NOW() - INTERVAL '6 days', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('880e8400-e29b-41d4-a716-446655440040', 250.00, 'Spotify Premium', 'Eğlence', NOW() - INTERVAL '11 days', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
('880e8400-e29b-41d4-a716-446655440041', 500.00, 'Kitap Alışverişi', 'Eğitim', NOW() - INTERVAL '14 days', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
('880e8400-e29b-41d4-a716-446655440042', 180.00, 'Sinema Bileti', 'Eğlence', NOW() - INTERVAL '8 days', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('880e8400-e29b-41d4-a716-446655440043', 95.00, 'Kuaför', 'Kişisel Bakım', NOW() - INTERVAL '9 days', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
('880e8400-e29b-41d4-a716-446655440044', 150.00, 'Amazon Alışverişi', 'Alışveriş', NOW() - INTERVAL '16 days', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'),
('880e8400-e29b-41d4-a716-446655440045', 320.00, 'Trendyol Alışverişi', 'Giyim', NOW() - INTERVAL '17 days', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days');

-- ============================================================================
-- 5. PAYMENTS (debt settlements between users)
-- ============================================================================

INSERT INTO "Payment" (id, amount, "fromUserId", "toUserId", "groupId", status, description, "createdAt", "completedAt", "updatedAt") VALUES
-- Completed payments
('990e8400-e29b-41d4-a716-446655440001', 1250.00, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'COMPLETED', 'Kira ve fatura payı', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days'),
('990e8400-e29b-41d4-a716-446655440002', 800.00, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'COMPLETED', 'Market ve temizlik malzemeleri payı', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days'),
('990e8400-e29b-41d4-a716-446655440003', 500.00, '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', 'COMPLETED', 'Araba servisi paylaşımı', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
('990e8400-e29b-41d4-a716-446655440004', 2500.00, '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'COMPLETED', 'Otel rezervasyonu payı', NOW() - INTERVAL '38 days', NOW() - INTERVAL '37 days', NOW() - INTERVAL '37 days'),
('990e8400-e29b-41d4-a716-446655440005', 400.00, '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440005', 'COMPLETED', 'Antrenör ücreti payı', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

-- Pending payments
('990e8400-e29b-41d4-a716-446655440006', 1250.00, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'PENDING', 'Kasım ayı kira payı', NOW() - INTERVAL '4 days', NULL, NOW() - INTERVAL '4 days'),
('990e8400-e29b-41d4-a716-446655440007', 600.00, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'PENDING', 'Fatura paylaşımı', NOW() - INTERVAL '3 days', NULL, NOW() - INTERVAL '3 days'),
('990e8400-e29b-41d4-a716-446655440008', 325.00, '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'PENDING', 'Market alışverişi borcu', NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '2 days'),
('990e8400-e29b-41d4-a716-446655440009', 50.00, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 'PENDING', 'Öğle yemeği payı', NOW() - INTERVAL '1 days', NULL, NOW() - INTERVAL '1 days'),
('990e8400-e29b-41d4-a716-446655440010', 750.00, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', 'PENDING', 'Tatil harcamaları payı', NOW() - INTERVAL '5 days', NULL, NOW() - INTERVAL '5 days'),

-- Cancelled payment
('990e8400-e29b-41d4-a716-446655440011', 200.00, '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440005', 'CANCELLED', 'İptal - Yanlış tutar girildi', NOW() - INTERVAL '15 days', NULL, NOW() - INTERVAL '14 days');

-- ============================================================================
-- 6. RECURRING REMINDERS (scheduled payment reminders)
-- ============================================================================

INSERT INTO "RecurringReminder" (id, title, description, amount, frequency, "groupId", "nextDueDate", "isActive", "createdById", "createdAt", "updatedAt") VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'Aylık Kira Ödemesi', 'Her ayın 1\inde ödenmesi gereken kira', 5000.00, 'MONTHLY', '660e8400-e29b-41d4-a716-446655440001', '2025-12-01 09:00:00', true, '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 day'),
('aa0e8400-e29b-41d4-a716-446655440002', 'Elektrik Faturası', 'Aylık elektrik faturası ödemesi', 850.00, 'MONTHLY', '660e8400-e29b-41d4-a716-446655440001', '2025-11-20 10:00:00', true, '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '55 days', NOW() - INTERVAL '2 days'),
('aa0e8400-e29b-41d4-a716-446655440003', 'İnternet Aboneliği', 'Aylık internet faturası', 250.00, 'MONTHLY', '660e8400-e29b-41d4-a716-446655440001', '2025-11-15 08:00:00', true, '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '50 days', NOW() - INTERVAL '1 day'),
('aa0e8400-e29b-41d4-a716-446655440004', 'Okul Ücreti', 'Çocuk okul ücreti - dönemlik', 1200.00, 'EVERY_6_MONTHS', '660e8400-e29b-41d4-a716-446655440002', '2026-02-01 09:00:00', true, '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '45 days', NOW() - INTERVAL '3 days'),
('aa0e8400-e29b-41d4-a716-446655440005', 'Araba Muayene', 'Araç muayene ücreti - yıllık', 500.00, 'YEARLY', '660e8400-e29b-41d4-a716-446655440002', '2026-06-15 10:00:00', true, '550e8400-e29b-41d4-a716-446655440006', NOW() - INTERVAL '40 days', NOW() - INTERVAL '2 days'),
('aa0e8400-e29b-41d4-a716-446655440006', 'Spor Salonu Antrenör', 'Aylık antrenör ücreti', 800.00, 'MONTHLY', '660e8400-e29b-41d4-a716-446655440005', '2025-12-05 15:00:00', true, '550e8400-e29b-41d4-a716-446655440009', NOW() - INTERVAL '35 days', NOW() - INTERVAL '1 day'),
('aa0e8400-e29b-41d4-a716-446655440007', 'Netflix Aboneliği', 'Aylık Netflix ödemesi', 120.00, 'MONTHLY', '660e8400-e29b-41d4-a716-446655440001', '2025-11-25 12:00:00', true, '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days'),
('aa0e8400-e29b-41d4-a716-446655440008', 'Haftalık Market Alışverişi', 'Her hafta yapılan rutin market alışverişi', 400.00, 'WEEKLY', '660e8400-e29b-41d4-a716-446655440001', '2025-11-13 18:00:00', true, '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '25 days', NOW() - INTERVAL '1 day'),
-- Overdue reminder for testing
('aa0e8400-e29b-41d4-a716-446655440009', 'Doğalgaz Faturası - GECİKMİŞ', 'Vadesi geçmiş doğalgaz faturası', 180.00, 'MONTHLY', '660e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '5 days', true, '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '35 days', NOW() - INTERVAL '5 days'),
-- Inactive reminder
('aa0e8400-e29b-41d4-a716-446655440010', 'Eski Abonelik', 'İptal edilmiş abonelik hatırlatıcısı', 50.00, 'MONTHLY', '660e8400-e29b-41d4-a716-446655440002', '2025-10-01 09:00:00', false, '550e8400-e29b-41d4-a716-446655440006', NOW() - INTERVAL '60 days', NOW() - INTERVAL '20 days');

-- ============================================================================
-- 7. GROUP INVITES (invite codes for joining groups)
-- ============================================================================

INSERT INTO "GroupInvite" (id, code, "groupId", "invitedById", "createdAt", "expiresAt", "maxUses", "usedCount", status) VALUES
-- Active invites
('bb0e8400-e29b-41d4-a716-446655440001', 'evarkadas2025', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 5, 3, 'ACTIVE'),
('bb0e8400-e29b-41d4-a716-446655440002', 'ailebudget123', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NULL, 2, 'ACTIVE'),
('bb0e8400-e29b-41d4-a716-446655440003', 'ofisyemek456', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '8 days', NOW() + INTERVAL '22 days', 10, 4, 'ACTIVE'),
('bb0e8400-e29b-41d4-a716-446655440004', 'tatil2025xyz', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', 4, 3, 'ACTIVE'),

-- Expired invite
('bb0e8400-e29b-41d4-a716-446655440005', 'oldinvite999', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '60 days', NOW() - INTERVAL '10 days', 5, 2, 'EXPIRED'),

-- Revoked invite
('bb0e8400-e29b-41d4-a716-446655440006', 'revokedcode', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440009', NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days', 3, 1, 'REVOKED');

-- ============================================================================
-- 8. AUDIT LOGS (sample audit trail entries)
-- ============================================================================

INSERT INTO "AuditLog" (id, "entityType", "entityId", action, "userId", "userName", "oldValues", "newValues", timestamp, "ipAddress", "userAgent") VALUES
-- User creation logs
('cc0e8400-e29b-41d4-a716-446655440001', 'User', '550e8400-e29b-41d4-a716-446655440002', 'CREATE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', NULL, '{"name": "Ayşe Yılmaz", "email": "ayse.yilmaz@example.com", "role": "user"}', NOW() - INTERVAL '80 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
('cc0e8400-e29b-41d4-a716-446655440002', 'User', '550e8400-e29b-41d4-a716-446655440003', 'CREATE', '550e8400-e29b-41d4-a716-446655440003', 'Mehmet Kaya', NULL, '{"name": "Mehmet Kaya", "email": "mehmet.kaya@example.com", "role": "user"}', NOW() - INTERVAL '75 days', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),

-- Group creation logs
('cc0e8400-e29b-41d4-a716-446655440003', 'Group', '660e8400-e29b-41d4-a716-446655440001', 'CREATE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', NULL, '{"name": "Ev Arkadaşları", "description": "Kira ve ortak giderler için grup"}', NOW() - INTERVAL '80 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
('cc0e8400-e29b-41d4-a716-446655440004', 'Group', '660e8400-e29b-41d4-a716-446655440002', 'CREATE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', NULL, '{"name": "Aile Bütçesi", "description": "Aile harcamaları takibi"}', NOW() - INTERVAL '75 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),

-- Expense creation logs
('cc0e8400-e29b-41d4-a716-446655440005', 'Expense', '880e8400-e29b-41d4-a716-446655440001', 'CREATE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', NULL, '{"amount": "5000.00", "description": "Kira Ödemesi - Kasım", "category": "Kira", "groupId": "660e8400-e29b-41d4-a716-446655440001"}', NOW() - INTERVAL '5 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
('cc0e8400-e29b-41d4-a716-446655440006', 'Expense', '880e8400-e29b-41d4-a716-446655440010', 'CREATE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', NULL, '{"amount": "1200.00", "description": "Okul Kayıt Ücreti", "category": "Eğitim", "groupId": "660e8400-e29b-41d4-a716-446655440002"}', NOW() - INTERVAL '20 days', '192.168.1.100', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)'),

-- Expense update log
('cc0e8400-e29b-41d4-a716-446655440007', 'Expense', '880e8400-e29b-41d4-a716-446655440002', 'UPDATE', '550e8400-e29b-41d4-a716-446655440003', 'Mehmet Kaya', '{"amount": "800.50", "description": "Elektrik Faturası"}', '{"amount": "850.50", "description": "Elektrik Faturası"}', NOW() - INTERVAL '9 days', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),

-- Payment creation logs
('cc0e8400-e29b-41d4-a716-446655440008', 'Payment', '990e8400-e29b-41d4-a716-446655440001', 'CREATE', '550e8400-e29b-41d4-a716-446655440003', 'Mehmet Kaya', NULL, '{"amount": "1250.00", "fromUserId": "550e8400-e29b-41d4-a716-446655440003", "toUserId": "550e8400-e29b-41d4-a716-446655440002", "status": "PENDING"}', NOW() - INTERVAL '30 days', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),

-- Payment status update
('cc0e8400-e29b-41d4-a716-446655440009', 'Payment', '990e8400-e29b-41d4-a716-446655440001', 'UPDATE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', '{"status": "PENDING"}', '{"status": "COMPLETED", "completedAt": "' || (NOW() - INTERVAL '29 days')::TEXT || '"}', NOW() - INTERVAL '29 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),

-- GroupMember role change
('cc0e8400-e29b-41d4-a716-446655440010', 'GroupMember', '770e8400-e29b-41d4-a716-446655440006', 'UPDATE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', '{"role": "member"}', '{"role": "admin"}', NOW() - INTERVAL '70 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),

-- Reminder creation
('cc0e8400-e29b-41d4-a716-446655440011', 'RecurringReminder', 'aa0e8400-e29b-41d4-a716-446655440001', 'CREATE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', NULL, '{"title": "Aylık Kira Ödemesi", "amount": "5000.00", "frequency": "MONTHLY", "isActive": true}', NOW() - INTERVAL '60 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),

-- Reminder deactivation
('cc0e8400-e29b-41d4-a716-446655440012', 'RecurringReminder', 'aa0e8400-e29b-41d4-a716-446655440010', 'UPDATE', '550e8400-e29b-41d4-a716-446655440006', 'Zeynep Özdemir', '{"isActive": true}', '{"isActive": false}', NOW() - INTERVAL '20 days', '192.168.1.105', 'Mozilla/5.0 (Linux; Android 11; SM-G991B)'),

-- Expense deletion
('cc0e8400-e29b-41d4-a716-446655440013', 'Expense', '880e8400-e29b-41d4-a716-446655440039', 'DELETE', '550e8400-e29b-41d4-a716-446655440002', 'Ayşe Yılmaz', '{"amount": "120.00", "description": "Netflix Aboneliği", "category": "Eğlence"}', NULL, NOW() - INTERVAL '5 days', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');

-- ============================================================================
-- VERIFICATION QUERIES (optional - run these to verify data insertion)
-- ============================================================================

-- SELECT 'Users' as entity, COUNT(*) as count FROM "User"
-- UNION ALL
-- SELECT 'Groups', COUNT(*) FROM "Group"
-- UNION ALL
-- SELECT 'GroupMembers', COUNT(*) FROM "GroupMember"
-- UNION ALL
-- SELECT 'Expenses', COUNT(*) FROM "Expense"
-- UNION ALL
-- SELECT 'Payments', COUNT(*) FROM "Payment"
-- UNION ALL
-- SELECT 'Reminders', COUNT(*) FROM "RecurringReminder"
-- UNION ALL
-- SELECT 'Invites', COUNT(*) FROM "GroupInvite"
-- UNION ALL
-- SELECT 'AuditLogs', COUNT(*) FROM "AuditLog";

-- ============================================================================
-- SUMMARY OF GENERATED DATA
-- ============================================================================
-- Users: 10 (1 admin, 9 regular users)
-- Groups: 5 (Ev Arkadaşları, Aile Bütçesi, Ofis Yemek Grubu, Tatil Planı, Spor Salonu)
-- GroupMembers: 19 (users distributed across groups with admin/member roles)
-- Expenses: 45 (diverse categories: Kira, Faturalar, Market, Yemek, Seyahat, Spor, etc.)
-- Payments: 11 (5 completed, 5 pending, 1 cancelled)
-- RecurringReminders: 10 (monthly, weekly, yearly, 6-month intervals; 1 overdue, 1 inactive)
-- GroupInvites: 6 (4 active, 1 expired, 1 revoked)
-- AuditLogs: 13 (CREATE, UPDATE, DELETE actions across all entity types)
-- ============================================================================
