# Text2SQL Few-Shot Examples Database

## Training Examples for AI Agent

### Category: Aggregate Queries (Total/Sum)

#### Example 1
**User Query (Turkish)**: "Bu ay ne kadar harcadım?"
**User Query (English)**: "How much did I spend this month?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "total expenses",
    "time_period": "this month"
  }
}
```
**Generated SQL Concept**:
```sql
SELECT SUM(amount), COUNT(*) FROM Expense 
WHERE groupId = $groupId AND date >= start_of_month
```
**Sample Response**:
```
Bu ay toplam ₺1,250.50 harcadınız (45 işlem).
```

#### Example 2
**User Query (Turkish)**: "Yemek için toplamda ne kadar para harcadım?"
**User Query (English)**: "How much did I spend on food in total?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "total food expenses",
    "category": "food"
  }
}
```
**Sample Response**:
```
Yemek kategorisinde toplam ₺850.00 harcadınız (25 işlem). 🍕
```

#### Example 3
**User Query (Turkish)**: "Dün ne kadar harcadım?"
**User Query (English)**: "How much did I spend yesterday?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "total expenses yesterday",
    "time_period": "yesterday"
  }
}
```

#### Example 4
**User Query (Turkish)**: "Bu yıl toplamda kaç TL harcadım?"
**User Query (English)**: "How many TL did I spend this year in total?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "total expenses",
    "time_period": "this year"
  }
}
```

---

### Category: Average Queries

#### Example 5
**User Query (Turkish)**: "Geçen ay ortalama harcamam ne kadar?"
**User Query (English)**: "What was my average expense last month?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "average expense",
    "time_period": "last month"
  }
}
```
**Generated SQL Concept**:
```sql
SELECT AVG(amount), COUNT(*) FROM Expense 
WHERE groupId = $groupId AND date BETWEEN start_of_last_month AND end_of_last_month
```
**Sample Response**:
```
Geçen ay ortalama ₺75.25 harcadınız (işlem başına).
```

#### Example 6
**User Query (Turkish)**: "Bu hafta günlük ortalama harcamam kaç TL?"
**User Query (English)**: "What's my daily average spending this week?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "average daily expense",
    "time_period": "this week"
  }
}
```

#### Example 7
**User Query (Turkish)**: "Ulaşım için ortalama ne kadar ödüyorum?"
**User Query (English)**: "What's my average transport expense?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "average transport expense",
    "category": "transport"
  }
}
```

---

### Category: Group By / Breakdown Queries

#### Example 8
**User Query (Turkish)**: "Kategorilere göre harcamalarımı göster"
**User Query (English)**: "Show my spending by category"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "spending by category"
  }
}
```
**Generated SQL Concept**:
```sql
SELECT category, SUM(amount), COUNT(*) FROM Expense 
WHERE groupId = $groupId 
GROUP BY category 
ORDER BY SUM(amount) DESC
```
**Sample Response**:
```
Harcamalarınızın kategorilere göre dağılımı:
🍕 Yemek: ₺850.00 (25 işlem) - %68
🚗 Ulaşım: ₺250.00 (15 işlem) - %20
🎬 Eğlence: ₺150.50 (5 işlem) - %12
```

#### Example 9
**User Query (Turkish)**: "Bu ay kategori bazında ne kadar harcadım?"
**User Query (English)**: "What did I spend per category this month?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "spending by category",
    "time_period": "this month"
  }
}
```

#### Example 10
**User Query (Turkish)**: "Hangi kategorilerde ne kadar para harcadım?"
**User Query (English)**: "How much did I spend in each category?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "breakdown by category"
  }
}
```

---

### Category: Top/Highest Queries

#### Example 11
**User Query (Turkish)**: "Bu haftaki en yüksek 5 harcamam neydi?"
**User Query (English)**: "What were my top 5 expenses this week?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "top 5 highest expenses",
    "time_period": "this week"
  }
}
```
**Generated SQL Concept**:
```sql
SELECT * FROM Expense 
WHERE groupId = $groupId AND date >= start_of_week 
ORDER BY amount DESC 
LIMIT 5
```
**Sample Response**:
```
Bu haftaki en yüksek harcamalarınız:
1. 💰 ₺250.00 - Market alışverişi (25 Ekim)
2. 💰 ₺120.00 - Benzin (24 Ekim)
3. 💰 ₺95.00 - Restoran (23 Ekim)
4. 💰 ₺75.00 - Kıyafet (22 Ekim)
5. 💰 ₺60.00 - Sinema (21 Ekim)
```

#### Example 12
**User Query (Turkish)**: "En pahalı 10 harcamam"
**User Query (English)**: "My 10 most expensive expenses"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "top 10 most expensive expenses"
  }
}
```

#### Example 13
**User Query (Turkish)**: "Bu ayki en büyük yemek harcamalarım"
**User Query (English)**: "My biggest food expenses this month"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "highest food expenses",
    "time_period": "this month",
    "category": "food"
  }
}
```

---

### Category: Recent/Latest Queries

#### Example 14
**User Query (Turkish)**: "Son 10 harcamam neydi?"
**User Query (English)**: "What were my last 10 expenses?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "last 10 expenses"
  }
}
```
**Generated SQL Concept**:
```sql
SELECT * FROM Expense 
WHERE groupId = $groupId 
ORDER BY date DESC 
LIMIT 10
```
**Sample Response**:
```
Son harcamalarınız:
1. ₺50.00 - Kahve (bugün 14:30)
2. ₺120.00 - Benzin (dün 18:45)
...
```

#### Example 15
**User Query (Turkish)**: "Son yemek harcamalarım"
**User Query (English)**: "My recent food expenses"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "recent food expenses",
    "category": "food"
  }
}
```

#### Example 16
**User Query (Turkish)**: "Bu haftaki alışverişlerimi göster"
**User Query (English)**: "Show my shopping this week"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "recent shopping expenses",
    "time_period": "this week",
    "category": "shopping"
  }
}
```

---

### Category: Time-Filtered Queries

#### Example 17
**User Query (Turkish)**: "Son 30 gündeki ulaşım harcamalarım"
**User Query (English)**: "My transport expenses in the last 30 days"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "transport expenses",
    "time_period": "last 30 days",
    "category": "transport"
  }
}
```

#### Example 18
**User Query (Turkish)**: "Son 7 günde ne kadar eğlence harcaması yaptım?"
**User Query (English)**: "How much did I spend on entertainment in the last 7 days?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "total entertainment expenses",
    "time_period": "last 7 days",
    "category": "entertainment"
  }
}
```

#### Example 19
**User Query (Turkish)**: "Geçen hafta kaç işlem yaptım?"
**User Query (English)**: "How many transactions did I make last week?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "transaction count",
    "time_period": "last week"
  }
}
```

#### Example 20
**User Query (Turkish)**: "Bugün ne kadar para harcadım?"
**User Query (English)**: "How much money did I spend today?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "total expenses today",
    "time_period": "today"
  }
}
```

---

### Category: Combined/Complex Queries

#### Example 21
**User Query (Turkish)**: "Bu ay yemek için haftada ortalama ne kadar harcıyorum?"
**User Query (English)**: "What's my weekly average on food this month?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "average food expenses per week",
    "time_period": "this month",
    "category": "food"
  }
}
```

#### Example 22
**User Query (Turkish)**: "Geçen ayki en çok harcama yaptığım kategori hangisi?"
**User Query (English)**: "Which category did I spend the most on last month?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "highest spending category",
    "time_period": "last month"
  }
}
```

#### Example 23
**User Query (Turkish)**: "Son 3 aydaki sağlık harcamalarımın toplamı?"
**User Query (English)**: "Total of my health expenses in the last 3 months?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "total health expenses",
    "time_period": "last 90 days",
    "category": "health"
  }
}
```

---

### Category: Count/Statistics Queries

#### Example 24
**User Query (Turkish)**: "Bu ay kaç işlem yaptım?"
**User Query (English)**: "How many transactions did I make this month?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "transaction count",
    "time_period": "this month"
  }
}
```

#### Example 25
**User Query (Turkish)**: "Toplamda kaç yemek harcamam var?"
**User Query (English)**: "How many food expenses do I have in total?"
**Tool Call**:
```json
{
  "name": "query_database",
  "arguments": {
    "query_description": "count of food expenses",
    "category": "food"
  }
}
```

---

## Edge Cases & Variations

### Time Period Variations
- "today" → bugün, bu gün
- "yesterday" → dün
- "this week" → bu hafta
- "last week" → geçen hafta
- "this month" → bu ay
- "last month" → geçen ay
- "this year" → bu yıl
- "last N days" → son N gün, geçtiğimiz N gün

### Category Variations
- food → yemek, gıda, yiyecek
- transport → ulaşım, ulaşim, taşıt
- entertainment → eğlence, eglence
- shopping → alışveriş, alisveris, market
- utilities → fatura, faturalar, hizmet
- health → sağlık, saglik, ilaç
- other → diğer, diger, genel

### Query Intent Keywords
- **Total**: toplam, toplamda, kaç tl, ne kadar, sum
- **Average**: ortalama, ort, avg, mean
- **Highest**: en yüksek, en büyük, en pahalı, top, biggest
- **Recent**: son, en son, latest, last
- **Count**: kaç, kaç tane, how many, count
- **List**: göster, listele, show, list
- **Breakdown**: göre, bazında, by, per

---

## Response Patterns

### For No Data Scenarios
**Query Result**: Empty/No data
**AI Response**:
```
Bu dönemde henüz harcama kaydınız yok. İlk harcamanızı eklemek ister misiniz? 💰
```

### For Single Result
**Query Result**: 1 expense
**AI Response**:
```
Bu dönemde sadece 1 harcamanız var:
₺50.00 - Kahve (25 Ekim)
```

### For Warning Scenarios
**Query Result**: Very high total
**AI Response**:
```
Bu ay ₺5,250.00 harcadınız - bütçenizin üzerinde görünüyor! ⚠️ 
En çok harcama yaptığınız kategori: Eğlence (₺2,100)
```

---

## Testing Checklist

Use these examples to test the Text2SQL agent:

- [ ] Turkish total query (Example 1)
- [ ] English total query (Example 1)
- [ ] Category filter (Example 2)
- [ ] Time period filter (Example 3)
- [ ] Average calculation (Example 5)
- [ ] Category breakdown (Example 8)
- [ ] Top N list (Example 11)
- [ ] Recent list (Example 14)
- [ ] Combined filters (Example 17)
- [ ] Count query (Example 24)
- [ ] Edge case: No data
- [ ] Edge case: Single result
- [ ] Mixed language query
- [ ] Ambiguous time period
- [ ] Invalid category (should default to all)
