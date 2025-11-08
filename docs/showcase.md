# Kompetensmatris - Företagsshowcase

Denna matris mappar teknisk kompetens mot företag där denna kompetens är särskilt relevant eller efterfrågad. Matrisen hjälper till att förstå vilka tekniker som är mest värdefulla inom olika branscher och företag.

## Matris: Teknik → Företag

| Teknik/kompetens | Företag | Relevansnivå | Anledningar |
|------------------|---------|--------------|-------------|
| **EF Core + Dapper** | EF Education First, Dustin | 🔥🔥🔥 | EF som utbildningsbolag behöver robust datahantering för student/lärarhantering. Dustin som IT-distributör behöver komplexa produktkataloger och inventory management. |
| | Folksam | 🔥🔥 | Pensions- och försäkringsbolag behöver högpresterande queries för stora datamängder och komplexa beräkningar. |
| | Aros/Decerno | 🔥🔥 | Managementkonsultbolag behöver flexibla datalager för olika kundprojekt och snabba read/write operationer. |
| **CQRS + MediatR** | HiQ, Aros | 🔥🔥🔥 | Konsultbolag som arbetar med komplexa system behöver separation av reads/writes och tydliga command patterns. |
| | Dustin, If | 🔥🔥 | E-handels- och försäkringsbolag har komplexa affärsregler som kräver CQRS för att hantera olika användarroller och operationer. |
| **JWT Bearer Auth** | Apoteket, If, Folksam | 🔥🔥🔥 | Hälso- och försäkringsbolag har strikta säkerhetskrav och behöver robust autentisering för känsliga patient/kunddata. |
| | Dustin, HiQ | 🔥🔥 | E-handelsbolag behöver säker API-kommunikation, konsultbolag implementerar ofta auth-lösningar för kunder. |
| **Rate Limiting** | Dustin, Apoteket | 🔥🔥🔥 | E-handels- och hälsoföretag behöver skydda mot överbelastning och säkerställa SLA för kritiska tjänster. |
| | If, Folksam | 🔥🔥 | Finansiella tjänster behöver rate limiting för API:er som hanterar känslig finansiell data. |
| **OpenTelemetry** | HiQ, Aros, Decerno | 🔥🔥🔥 | Konsultbolag implementerar ofta observabilitet för sina kunders system och behöver expertis inom distributed tracing. |
| | Dustin, If | 🔥🔥 | Större företag med komplexa system behöver omfattande monitoring och tracing för att säkerställa uptime. |
| **OWASP ASVS L1** | Apoteket, If, Folksam | 🔥🔥🔥 | Hälso- och finansbolag har de högsta säkerhetskraven och behöver compliance med säkerhetsstandarder. |
| | Dustin, HiQ | 🔥🔥 | E-handelsbolag hanterar betalningsinformation, konsultbolag implementerar säkerhet för kunder. |
| **Minimal APIs** | HiQ, Aros, Decerno | 🔥🔥🔥 | Konsultbolag föredrar ofta moderna, lättviktiga API-ramverk för nya projekt och mikrotjänster. |
| | Dustin, If | 🔥🔥 | Företag som moderniserar system behöver effektiva API:er för integrationer och mikrotjänstarkitekturer. |
| **DDD Patterns** | Aros, Decerno, HiQ | 🔥🔥🔥 | Managementkonsultbolag specialiserar sig ofta på komplexa domändesign och affärslogik-modellering. |
| | If, Folksam | 🔥🔥 | Försäkringsbolag har komplexa affärsregler som kräver välstrukturerad domänmodellering. |
| **Docker Compose** | Alla ovan | 🔥🔥 | Alla större företag använder containerisering för utveckling, testning och deployment. |
| **Integration Testing** | HiQ, Aros | 🔥🔥🔥 | Konsultbolag behöver ofta skapa omfattande integrationstester för kundprojekt. |
| | Dustin, If | 🔥🔥 | E-handels- och finansbolag behöver pålitliga tester för kritiska affärsprocesser. |
| **CI/CD GitHub Actions** | Alla ovan | 🔥🔥 | Moderna företag använder GitHub Actions eller liknande verktyg för automatiserad bygg och deployment. |
| **CodeQL Security** | Apoteket, If, Folksam | 🔥🔥🔥 | Företag med höga säkerhetskrav använder statisk säkerhetsanalys som en del av SDLC. |
| **Health Checks** | Dustin, If, Folksam | 🔥🔥 | E-handels- och finansbolag behöver omfattande hälsoövervakning för hög tillgänglighet. |
| | Apoteket | 🔥🔥🔥 | Hälsoföretag har extra strikta krav på systemtillgänglighet och övervakning. |

## Företagsprofiler

### **EF Education First**
- **Bransch**: Utbildning/Global Språkskola
- **Systemstorlek**: Stort, globalt med miljoner användare
- **Nyckeltekniker**: EF Core + Dapper (prestanda för stora datasets), JWT Auth (säker åtkomst till utbildningsdata)
- **Varför relevant**: Hanterar studentregistrering, kursadministration, internationella betalningar

### **Dustin**
- **Bransch**: IT-distribution/E-handel
- **Systemstorlek**: Stort nationellt företag
- **Nyckeltekniker**: CQRS (komplexa produktkataloger), Rate Limiting (skydda e-handelssystem), OpenTelemetry (spåra prestanda)
- **Varför relevant**: Bred IT-produktportfölj kräver sofistikerad kataloghantering och hög tillgänglighet

### **Folksam**
- **Bransch**: Försäkring/Pensionssparande
- **Systemstorlek**: Stort finansbolag
- **Nyckeltekniker**: Dapper (höga prestandakrav), JWT Auth (säker kunddata), OWASP ASVS (finansiell compliance)
- **Varför relevant**: Hanterar känslig finansiell data och behöver hög säkerhet och prestanda

### **Aros/Decerno**
- **Bransch**: Managementkonsult
- **Systemstorlek**: Medelstort konsultbolag
- **Nyckeltekniker**: CQRS + MediatR (komplexa kundprojekt), DDD Patterns (affärslogik), OpenTelemetry (kundsystem)
- **Varför relevant**: Arbetar med diverse kundprojekt som kräver olika tekniska lösningar

### **HiQ**
- **Bransch**: IT-konsult
- **Systemstorlek**: Stort konsultbolag
- **Nyckeltekniker**: Minimal APIs (moderna lösningar), Integration Testing (kvalitetssäkring), CodeQL (säkerhet)
- **Varför relevant**: Bred teknisk expertis och arbetar med många olika teknologier och säkerhetskrav

### **If (försäkringsbolag)**
- **Bransch**: Försäkring
- **Systemstorlek**: Stort nordiskt försäkringsbolag
- **Nyckeltekniker**: JWT Auth (kundidentitet), Rate Limiting (API-skydd), Health Checks (hög tillgänglighet)
- **Varför relevant**: Kritiska system kräver säkerhet, prestanda och övervakning

### **Apoteket**
- **Bransch**: Hälsa/Pharma
- **Systemstorlek**: Nationellt hälsoföretag
- **Nyckeltekniker**: OWASP ASVS L1 (säkerhet), Health Checks (kritisk tillgänglighet), JWT Auth (patientdata)
- **Varför relevant**: Hanterar känslig hälsoinformation och läkemedel kräver högsta säkerhetsstandarder

## Rekommendationer för Kompetensutveckling

### För Junior/Medior Utvecklare:
1. **Börja med grunderna**: EF Core, Minimal APIs, Docker
2. **Lägg till säkerhet**: JWT Auth, OWASP grunderna
3. **Lär dig testning**: xUnit, Integration Testing med Testcontainers

### För Senior Utvecklare:
1. **Avancerade patterns**: CQRS, DDD, MediatR
2. **Observabilitet**: OpenTelemetry, Health Checks
3. **Säkerhet compliance**: OWASP ASVS, CodeQL

### För Arkitekter/Tech Leads:
1. **Systemdesign**: CQRS, Event Sourcing (framtida expansion)
2. **DevOps**: CI/CD, Container orchestration
3. **Compliance**: OWASP, NIST, säkerhetsauditering

## Teknisk Roadmap

### Nästa Steg (för detta projekt):
- **Event Sourcing**: För audit trails och CQRS-framtid
- **API Gateway**: För microservice orchestration
- **Advanced Monitoring**: ELK stack integration
- **Multi-region Deployment**: Azure/AWS multi-region setup

### Framtida Utvidgningar:
- **GraphQL**: För flexibla API:er
- **gRPC**: För högpresterande intern kommunikation
- **Event-driven Architecture**: För skalbara system
- **Machine Learning**: För prediktiv analys

---

*Denna matris uppdateras kontinuerligt baserat på marknadstrender och tekniska framsteg.*
