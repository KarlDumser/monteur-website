import fs from 'fs';
import path from 'path';

const localeDir = path.join(process.cwd(), 'src', 'locales');

const updates = {
  ro: {
    common: { selected: 'Activ' },
    home: {
      importantNote: 'Deosebit de important',
      featuresAndServices: 'Dotari si servicii:',
      earlyBookingPriceHint: '*La rezervare timpurie si {{count}} persoane.',
      availabilityHeadline: 'Disponibilitati',
      galleryWithCount: '📷 Galerie ({{count}} imagini)',
      bookingStartHint:
        '📅 Incepeti rezervarea: In pasul urmator alegeti perioada dorita si verificati disponibilitatea ambelor apartamente.'
    },
    directions: {
      title: 'Acces',
      calculatorTitle: 'Introdu santierul si calculeaza ruta',
      apartmentTitle: 'Apartament Fruehlingstrasse',
      addressLabel: 'Adresa',
      country: 'Germania',
      byCarLabel: 'Acces cu masina',
      byCarText: 'Aproximativ 30 de minute de centrul orasului',
      publicTransportLabel: 'Transport public',
      publicTransportText: 'Statia S-Bahn Stockdorf, linia S6 catre centru',
      parkingLabel: 'Parcare',
      parkingText: 'Parcare gratuita la locatie',
      keyHandoverLabel: 'Predarea cheilor',
      keyHandoverText: 'Predarea cheilor are loc intotdeauna la Fruehlingstrasse.',
      openMaps: 'Deschide ruta in Google Maps'
    },
    success: {
      title: 'Rezervare confirmata!',
      confirmationPrefix: 'Multumim pentru rezervare. Am trimis un e-mail de confirmare la',
      yourEmail: 'adresa dvs. de e-mail',
      confirmationSuffix: '.',
      nextStepsTitle: 'Urmatorii pasi:',
      nextStepsText: 'Veti primi in curand un e-mail cu toate informatiile si factura pentru rezervare.',
      downloadInvoice: 'Descarca factura',
      backHome: 'Inapoi la pagina principala',
      tipTitle: 'Sfat:',
      tipText: 'Daca nu gasiti e-mailul, verificati si folderul Spam sau Junk.'
    },
    cancelPage: {
      title: 'Plata anulata',
      subtitle: 'Rezervarea nu a fost finalizata. Nu a fost debitata nicio suma.',
      retryTitle: 'Doriti sa incercati din nou?',
      retryText: 'Apasati mai jos pe "Rezervare noua" pentru a reporni procesul de rezervare.',
      newBooking: 'Rezervare noua',
      back: 'Inapoi'
    },
    payment: {
      preparing: 'Se pregateste plata...',
      bookingDataMissing: 'Eroare: datele rezervarii nu au fost gasite',
      title: 'Verifica rezervarea',
      bookingDetails: 'Detalii rezervare',
      partialIntro: 'Rezervati intreaga perioada',
      nights: 'nopti',
      partialHintPrefix: 'Prima factura este pentru',
      partialHintStrong: 'primele 4 saptamani (28 nopti)',
      partialHintSuffix: 'Pentru restul perioadei primiti o factura ulterioara cu o saptamana inainte.',
      apartmentLabel: 'Apartament:',
      reservationPeriod: 'Perioada rezervarii:',
      payNowFirstWeeks: 'De plata acum (primele 4 saptamani):',
      periodLabel: 'Perioada:',
      invoiceNights: 'Nopti (aceasta factura):',
      nightCount: 'Numar nopti:',
      peopleLabel: 'Persoane:',
      contactDetails: 'Date de contact',
      name: 'Nume:',
      email: 'E-mail:',
      mobile: 'Mobil:',
      landline: 'Telefon fix:',
      accommodationLine: 'Cazare ({{nights}} nopti × {{price}}€):',
      monthlyCleaning: 'curatenie lunara',
      finalCleaning: 'curatenie finala',
      netTotal: 'Suma neta:',
      earlyDiscount: 'Reducere rezervare timpurie (-10%):',
      vat: 'plus 7% TVA:',
      invoiceAmount: 'Valoare factura:',
      paymentMethod: 'Metoda de plata',
      paymentType: 'Tip plata',
      onInvoice: 'Pe factura',
      onlyInvoiceHint: 'Nota: momentan este disponibila doar plata pe factura.',
      createBookingError: 'Rezervarea nu a putut fi creata. Va rugam sa incercati din nou.',
      connectionError: 'Eroare de conexiune. Verificati internetul si incercati din nou.',
      processing: 'Se proceseaza rezervarea...',
      bookNow: 'Rezerva acum cu obligativitate',
      invoiceByEmail: 'Dupa rezervare primiti factura prin e-mail.'
    },
    properties: {
      home: {
        hackerberg: {
          titel: 'Apartament Krailling, Hackerberg - Penthouse',
          beschreibung: 'Penthouse cu 2,5 camere la etajul 5, cu lift si balcon panoramic',
          preis: 'de la 18 EUR per persoana/noapte!',
          zimmer: '2,5 camere',
          flaeche: '65 m²',
          details: 'Acces propriu, bucatarie complet utilata si baie (cu cada si dus)',
          features: [
            'Masina de spalat cu uscator in subsol',
            '2 paturi single in camera 1, 2 paturi single in camera 2 (unul Queen size)',
            'WiFi 150 Mbit/s gratuit',
            'TV satelit',
            'Locuri de parcare direct in fata casei',
            'Zona rezidentiala linistita',
            'Aproape: biergarten, lac natural pentru baie, magazine si banci'
          ]
        },
        neubau: {
          titel: 'Apartament Krailling, Fruehlingstrasse - Cladire noua',
          beschreibung: 'Apartament cu 2 camere, acces propriu si gradina cu zona de gratar',
          preis: 'de la 16 EUR per persoana/noapte!',
          zimmer: '2 camere',
          flaeche: '58 m²',
          details: 'Acces propriu, bucatarie complet utilata si baie (cu cada si dus)',
          features: [
            'Masina de spalat cu uscator',
            '2 paturi single in fiecare camera (cate unul Queen size)',
            'WiFi 150 Mbit/s gratuit',
            'TV satelit',
            'Parcare pentru autoturisme si camioane cu remorca in fata casei',
            'Folosirea gradinii cu posibilitate de gratar',
            'Zona rezidentiala linistita',
            'Aproape: biergarten, lac natural pentru baie, magazine si banci'
          ]
        }
      },
      booking: {
        neubau: {
          titel: 'Fruehlingstrasse - Cladire noua',
          beschreibung:
            'Apartament cu 2 camere, bucatarie complet utilata, baie si gradina cu gratar. Ideal pentru specialisti si montatori.',
          details: 'Acces propriu, bucatarie complet utilata si baie (cu cada si dus)',
          zimmer: '2 camere',
          flaeche: '58 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Gradina, gratar, zona linistita',
          features: [
            'Masina de spalat cu uscator',
            '3 paturi single in fiecare camera (cate unul Queen size)',
            'WiFi 150 Mbit/s gratuit',
            'TV satelit',
            'Parcare pentru autoturisme si camioane cu remorca in fata casei',
            'Folosirea gradinii cu posibilitate de gratar',
            'Zona rezidentiala linistita',
            'Aproape: biergarten, lac natural pentru baie, magazine si banci'
          ],
          preis: '110 EUR/noapte + 100 EUR curatenie finala'
        },
        hackerberg: {
          titel: 'Hackerberg - Penthouse',
          beschreibung:
            'Penthouse cu 2 camere, balcon generos de 35m², bucatarie, baie si vedere panoramica. 2 paturi single in fiecare camera.',
          details: 'Acces propriu, bucatarie complet utilata si baie (cu cada si dus)',
          zimmer: '2,5 camere',
          flaeche: '65 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Balcon mare, vedere panoramica, zona linistita',
          features: [
            'Masina de spalat cu uscator in subsol',
            '2 paturi single in camera 1, 2 paturi single in camera 2 (unul Queen size)',
            'WiFi 150 Mbit/s gratuit',
            'TV satelit',
            'Locuri de parcare direct in fata casei',
            'Zona rezidentiala linistita',
            'Aproape: biergarten, lac natural pentru baie, magazine si banci'
          ],
          preis: '110 EUR/noapte + 100 EUR curatenie finala'
        },
        kombi: {
          titel: 'Pachet combo: Hackerberg + Fruehlingstrasse',
          beschreibung: 'Ambele apartamente impreuna. Ideal pentru echipe mai mari de 7-11 persoane.',
          internet: 'WiFi 100-150 Mbit/s',
          extras: 'Doua apartamente, doua bucatarii, doua bai',
          preis: 'Pachet combo',
          galleries: {
            fruehling: 'Fruehlingstrasse',
            hackerberg: 'Hackerberg'
          }
        }
      }
    },
    bookingPage: {
      steps: {
        bookApartment: 'Rezerva apartament',
        chooseDates: 'Pasul 1: Alegeti datele de sosire',
        availableApartments: 'Apartamente disponibile',
        chooseApartment: 'Pasul 2: Alegeti un apartament',
        yourData: 'Datele dvs.',
        companyAndContact: 'Pasul 3: Date firma si contact'
      }
    },
    impressumPage: { title: 'Informatii legale' },
    datenschutzPage: { title: 'Declaratie de protectie a datelor' },
    agbPage: { title: 'Termeni si conditii generale' },
    widerrufPage: { title: 'Drept de retragere si formular de retragere' }
  },
  hu: {
    common: { selected: 'Aktiv' },
    home: {
      importantNote: 'Kulonosen fontos',
      featuresAndServices: 'Felszereltseg es szolgaltatasok:',
      earlyBookingPriceHint: '*Elore foglalas es {{count}} fo eseten.',
      availabilityHeadline: 'Elerhetoseg',
      galleryWithCount: '📷 Galeria ({{count}} kep)',
      bookingStartHint:
        '📅 Foglalas inditasa: A kovetkezo lepesben valassza ki a kivant idoszakot, es ellenorizze mindket apartman elerhetoseget.'
    },
    directions: {
      title: 'Megkozelites',
      calculatorTitle: 'Adja meg az epitkezest, es szamolja ki az utvonalat',
      apartmentTitle: 'Fruehlingstrasse apartman',
      addressLabel: 'Cim',
      country: 'Nemetorszag',
      byCarLabel: 'Megkozelites autoval',
      byCarText: 'Kb. 30 perc a varoskozponttol',
      publicTransportLabel: 'Tomegkozlekedes',
      publicTransportText: 'Stockdorf S-Bahn allomas, S6 vonal a varoskozpont fele',
      parkingLabel: 'Parkolas',
      parkingText: 'Ingyenes parkolas a helyszinen',
      keyHandoverLabel: 'Kulcsatadas',
      keyHandoverText: 'A kulcsatadas mindig a Fruehlingstrasse cimen tortenik.',
      openMaps: 'Utvonal megnyitasa a Google Maps-ben'
    },
    success: {
      title: 'Foglalas megerositve!',
      confirmationPrefix: 'Koszonjuk foglalasat. Megerosito e-mailt kuldtunk erre a cimre:',
      yourEmail: 'az On e-mail-cime',
      confirmationSuffix: '.',
      nextStepsTitle: 'Kovetkezo lepesek:',
      nextStepsText: 'Rovidesen e-mailt kap minden tovabbi informacioval es a foglalas szamlajaval.',
      downloadInvoice: 'Szamla letoltese',
      backHome: 'Vissza a kezdolapra',
      tipTitle: 'Tipp:',
      tipText: 'Ha nem talalja az e-mailt, ellenorizze a spam vagy levelszemet mappat is.'
    },
    cancelPage: {
      title: 'Fizetes megszakitva',
      subtitle: 'A foglalas nem fejezodott be. Nem tortent terheles.',
      retryTitle: 'Szeretne ujra megprobalni?',
      retryText: 'Kattintson lent az "Uj foglalas" gombra a folyamat ujrainditasahoz.',
      newBooking: 'Uj foglalas',
      back: 'Vissza'
    },
    payment: {
      preparing: 'Fizetes elokeszitese...',
      bookingDataMissing: 'Hiba: foglalasi adatok nem talalhatok',
      title: 'Foglalas ellenorzese',
      bookingDetails: 'Foglalas reszletei',
      partialIntro: 'A teljes idoszakot foglalja',
      nights: 'ejszaka',
      partialHintPrefix: 'Az elso szamla a',
      partialHintStrong: 'elso 4 hetre (28 ejszaka) szol',
      partialHintSuffix: 'A fennmarado idoszakrol egy hettel korabban kuldjuk a kovetkezo szamlat.',
      apartmentLabel: 'Apartman:',
      reservationPeriod: 'Foglalasi idoszak:',
      payNowFirstWeeks: 'Most fizetendo (elso 4 het):',
      periodLabel: 'Idoszak:',
      invoiceNights: 'Ejszakak (ezen a szamlan):',
      nightCount: 'Ejszakak szama:',
      peopleLabel: 'Szemelyek:',
      contactDetails: 'Kapcsolati adatok',
      name: 'Nev:',
      email: 'E-mail:',
      mobile: 'Mobil:',
      landline: 'Vezetekes:',
      accommodationLine: 'Szallas ({{nights}} ejszaka × {{price}}€):',
      monthlyCleaning: 'havi takaritas',
      finalCleaning: 'vegso takaritas',
      netTotal: 'Netto osszeg:',
      earlyDiscount: 'Elore foglalasi kedvezmeny (-10%):',
      vat: 'plusz 7% AFA:',
      invoiceAmount: 'Szamla osszege:',
      paymentMethod: 'Fizetesi mod',
      paymentType: 'Fizetes tipusa',
      onInvoice: 'Szamlara',
      onlyInvoiceHint: 'Megjegyzes: jelenleg csak szamlas fizetes erheto el.',
      createBookingError: 'A foglalast nem sikerult letrehozni. Probald ujra.',
      connectionError: 'Kapcsolati hiba. Ellenorizd az internetkapcsolatot, majd probald ujra.',
      processing: 'Foglalas feldolgozasa...',
      bookNow: 'Kotelezo ereju foglalas most',
      invoiceByEmail: 'Foglalas utan e-mailben kapja meg a szamlat.'
    },
    properties: {
      home: {
        hackerberg: {
          titel: 'Krailling apartman, Hackerberg - Penthouse',
          beschreibung: '2,5 szobas penthouse az 5. emeleten lifttel es panoramas erkellyel',
          preis: '18 EUR/fotol/ejszaka!',
          zimmer: '2,5 szoba',
          flaeche: '65 m²',
          details: 'Kulon bejarat, teljesen felszerelt konyha es furdoszoba (kad es zuhany)',
          features: [
            'Mosogep szaritogeppel a pinceben',
            '2 egyagyas az 1. szobaban, 2 egyagyas a 2. szobaban (egyik Queen size)',
            'Ingyenes WiFi 150 Mbit/s',
            'Muholdas TV',
            'Parkolohelyek kozvetlenul a haz elott',
            'Csendes lakookorzet',
            'Kozeleben: sorkert, termeszetes to, uzletek es bankok'
          ]
        },
        neubau: {
          titel: 'Krailling apartman, Fruehlingstrasse - Uj epites',
          beschreibung: '2 szobas apartman sajat bejarattal, kerttel es grillezesi lehetoseggel',
          preis: '16 EUR/fotol/ejszaka!',
          zimmer: '2 szoba',
          flaeche: '58 m²',
          details: 'Kulon bejarat, teljesen felszerelt konyha es furdoszoba (kad es zuhany)',
          features: [
            'Mosogep szaritogeppel',
            '2 egyagyas minden szobaban (egyik Queen size)',
            'Ingyenes WiFi 150 Mbit/s',
            'Muholdas TV',
            'Parkolas szemelyautohoz es potkocsis teherautohoz a haz elott',
            'Kert hasznalata grillezesi lehetoseggel',
            'Csendes lakookorzet',
            'Kozeleben: sorkert, termeszetes to, uzletek es bankok'
          ]
        }
      },
      booking: {
        neubau: {
          titel: 'Fruehlingstrasse - Uj epites',
          beschreibung:
            '2 szobas apartman teljesen felszerelt konyhaval, furdoszobaval es kerti grillezessel. Idealisszakembereknek es szereloknek.',
          details: 'Kulon bejarat, teljesen felszerelt konyha es furdoszoba (kad es zuhany)',
          zimmer: '2 szoba',
          flaeche: '58 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Kert, grill, csendes elhelyezkedes',
          features: [
            'Mosogep szaritogeppel',
            '3 egyagyas minden szobaban (egyik Queen size)',
            'Ingyenes WiFi 150 Mbit/s',
            'Muholdas TV',
            'Parkolas szemelyautohoz es potkocsis teherautohoz a haz elott',
            'Kert hasznalata grillezesi lehetoseggel',
            'Csendes lakookorzet',
            'Kozeleben: sorkert, termeszetes to, uzletek es bankok'
          ],
          preis: '110 EUR/ejszaka + 100 EUR vegso takaritas'
        },
        hackerberg: {
          titel: 'Hackerberg - Penthouse',
          beschreibung:
            '2 szobas penthouse nagy 35 m²-es erkellyel, konyhaval, furdoszobaval es panoramaval. Minden szobaban 2 egyagyas.',
          details: 'Kulon bejarat, teljesen felszerelt konyha es furdoszoba (kad es zuhany)',
          zimmer: '2,5 szoba',
          flaeche: '65 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Nagy erkely, panoramasi latvany, csendes hely',
          features: [
            'Mosogep szaritogeppel a pinceben',
            '2 egyagyas az 1. szobaban, 2 egyagyas a 2. szobaban (egyik Queen size)',
            'Ingyenes WiFi 150 Mbit/s',
            'Muholdas TV',
            'Parkolohelyek kozvetlenul a haz elott',
            'Csendes lakookorzet',
            'Kozeleben: sorkert, termeszetes to, uzletek es bankok'
          ],
          preis: '110 EUR/ejszaka + 100 EUR vegso takaritas'
        },
        kombi: {
          titel: 'Kombi csomag: Hackerberg + Fruehlingstrasse',
          beschreibung: 'Mindket apartman egyutt. Ideal 7-11 fos nagyobb csapatoknak.',
          internet: 'WiFi 100-150 Mbit/s',
          extras: 'Ket apartman, ket konyha, ket furdoszoba',
          preis: 'Kombi csomag',
          galleries: {
            fruehling: 'Fruehlingstrasse',
            hackerberg: 'Hackerberg'
          }
        }
      }
    },
    bookingPage: {
      steps: {
        bookApartment: 'Apartman foglalasa',
        chooseDates: '1. lepes: Valassza ki az erkezesi datumokat',
        availableApartments: 'Elerheto apartmanok',
        chooseApartment: '2. lepes: Valasszon apartmant',
        yourData: 'Az On adatai',
        companyAndContact: '3. lepes: Ceghoz kapcsolodo adatok es kapcsolat'
      }
    },
    impressumPage: { title: 'Impresszum' },
    datenschutzPage: { title: 'Adatvedelmi tajekoztato' },
    agbPage: { title: 'Altalanos szerzodesi feltetelek' },
    widerrufPage: { title: 'Elallasi jog es elallasi nyilatkozat' }
  },
  sk: {
    common: { selected: 'Aktivne' },
    home: {
      importantNote: 'Obzvlast dolezite',
      featuresAndServices: 'Vybavenie a sluzby:',
      earlyBookingPriceHint: '*Pri vcasnej rezervacii a {{count}} osobach.',
      availabilityHeadline: 'Dostupnost',
      galleryWithCount: '📷 Galeria ({{count}} obrazkov)',
      bookingStartHint:
        '📅 Spustit rezervaciu: V dalsom kroku vyberte pozadovany termin a skontrolujte dostupnost oboch bytov.'
    },
    directions: {
      title: 'Doprava',
      calculatorTitle: 'Zadajte stavbu a vypocitajte trasu',
      apartmentTitle: 'Byt Fruehlingstrasse',
      addressLabel: 'Adresa',
      country: 'Nemecko',
      byCarLabel: 'Prichod autom',
      byCarText: 'Priblizne 30 minut od centra mesta',
      publicTransportLabel: 'Verejna doprava',
      publicTransportText: 'Stanica S-Bahn Stockdorf, linka S6 smer centrum',
      parkingLabel: 'Parkovanie',
      parkingText: 'Bezplatne parkovanie na mieste',
      keyHandoverLabel: 'Odovzdanie klucov',
      keyHandoverText: 'Odovzdanie klucov prebieha vzdy na Fruehlingstrasse.',
      openMaps: 'Otvorit trasu v Google Maps'
    },
    success: {
      title: 'Rezervacia potvrdena!',
      confirmationPrefix: 'Dakujeme za rezervaciu. Potvrdzujuci e-mail sme poslali na',
      yourEmail: 'vasu e-mailovu adresu',
      confirmationSuffix: '.',
      nextStepsTitle: 'Dalsie kroky:',
      nextStepsText: 'Coskoro dostanete e-mail so vsetkymi informaciami a fakturou k rezervacii.',
      downloadInvoice: 'Stiahnut fakturu',
      backHome: 'Spat na uvodnu stranku',
      tipTitle: 'Tip:',
      tipText: 'Ak e-mail nevidite, skontrolujte aj priecinok Spam alebo Neziaduca posta.'
    },
    cancelPage: {
      title: 'Platba zrusena',
      subtitle: 'Vasa rezervacia nebola dokoncena. Nebola zauctovana ziadna suma.',
      retryTitle: 'Chcete to skusit znova?',
      retryText: 'Kliknite nizsie na "Nova rezervacia" a spustite proces znova.',
      newBooking: 'Nova rezervacia',
      back: 'Spat'
    },
    payment: {
      preparing: 'Pripravuje sa platba...',
      bookingDataMissing: 'Chyba: udaje rezervacie sa nenasli',
      title: 'Skontrolovat rezervaciu',
      bookingDetails: 'Detaily rezervacie',
      partialIntro: 'Rezervujete cele obdobie',
      nights: 'noci',
      partialHintPrefix: 'Prva faktura je za',
      partialHintStrong: 'prve 4 tyzdne (28 noci)',
      partialHintSuffix: 'Za zvysok obdobia dostanete naslednu fakturu tyzden vopred.',
      apartmentLabel: 'Byt:',
      reservationPeriod: 'Obdobie rezervacie:',
      payNowFirstWeeks: 'Teraz zaplatit (prve 4 tyzdne):',
      periodLabel: 'Obdobie:',
      invoiceNights: 'Noci (na tejto fakture):',
      nightCount: 'Pocet noci:',
      peopleLabel: 'Osoby:',
      contactDetails: 'Kontaktne udaje',
      name: 'Meno:',
      email: 'E-mail:',
      mobile: 'Mobil:',
      landline: 'Pevna linka:',
      accommodationLine: 'Ubytovanie ({{nights}} noci × {{price}}€):',
      monthlyCleaning: 'mesacne upratovanie',
      finalCleaning: 'zaverecne upratovanie',
      netTotal: 'Cista suma:',
      earlyDiscount: 'Zlava za vcasnu rezervaciu (-10%):',
      vat: 'plus 7% DPH:',
      invoiceAmount: 'Suma faktury:',
      paymentMethod: 'Sposob platby',
      paymentType: 'Typ platby',
      onInvoice: 'Na fakturu',
      onlyInvoiceHint: 'Poznamka: momentalne je mozna iba platba na fakturu.',
      createBookingError: 'Rezervaciu sa nepodarilo vytvorit. Skuste to znova.',
      connectionError: 'Chyba pripojenia. Skontrolujte internetove pripojenie a skuste znova.',
      processing: 'Spracovanie rezervacie...',
      bookNow: 'Zavazne rezervovat teraz',
      invoiceByEmail: 'Po rezervacii dostanete fakturu e-mailom.'
    },
    properties: {
      home: {
        hackerberg: {
          titel: 'Byt Krailling, Hackerberg - Penthouse',
          beschreibung: '2,5-izbovy penthouse na 5. poschodi s vytahom a panoramatickym balkonom',
          preis: 'od 18 EUR na osobu/noc!',
          zimmer: '2,5 izby',
          flaeche: '65 m²',
          details: 'Vlastny vstup, plne vybavena kuchyna a kupelna (vana aj sprcha)',
          features: [
            'Pracka so susickou v suterene',
            '2 jednolozkove postele v 1. izbe, 2 jednolozkove postele v 2. izbe (jedna Queen size)',
            'Bezplatne WiFi 150 Mbit/s',
            'Satelitna TV',
            'Parkovanie priamo pred domom',
            'Ticha obytna lokalita',
            'Nablizku: pivna zahrada, prirodne jazero na kupanie, obchody a banky'
          ]
        },
        neubau: {
          titel: 'Byt Krailling, Fruehlingstrasse - Novostavba',
          beschreibung: '2-izbovy byt s vlastnym vstupom a zahradou s miestom na grilovanie',
          preis: 'od 16 EUR na osobu/noc!',
          zimmer: '2 izby',
          flaeche: '58 m²',
          details: 'Vlastny vstup, plne vybavena kuchyna a kupelna (vana aj sprcha)',
          features: [
            'Pracka so susickou',
            '2 jednolozkove postele v kazdej izbe (jedna Queen size)',
            'Bezplatne WiFi 150 Mbit/s',
            'Satelitna TV',
            'Parkovanie pre auta aj nakladne vozidla s privesom pred domom',
            'Pouzivanie zahrady s moznostou grilovania',
            'Ticha obytna lokalita',
            'Nablizku: pivna zahrada, prirodne jazero na kupanie, obchody a banky'
          ]
        }
      },
      booking: {
        neubau: {
          titel: 'Fruehlingstrasse - Novostavba',
          beschreibung:
            '2-izbovy byt s plne vybavenou kuchynou, kupelnou a zahradou s grilom. Idealne pre remeselnikov a monterov.',
          details: 'Vlastny vstup, plne vybavena kuchyna a kupelna (vana aj sprcha)',
          zimmer: '2 izby',
          flaeche: '58 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Zahrada, gril, ticha poloha',
          features: [
            'Pracka so susickou',
            '3 jednolozkove postele v kazdej izbe (jedna Queen size)',
            'Bezplatne WiFi 150 Mbit/s',
            'Satelitna TV',
            'Parkovanie pre auta aj nakladne vozidla s privesom pred domom',
            'Pouzivanie zahrady s moznostou grilovania',
            'Ticha obytna lokalita',
            'Nablizku: pivna zahrada, prirodne jazero na kupanie, obchody a banky'
          ],
          preis: '110 EUR/noc + 100 EUR zaverecne upratovanie'
        },
        hackerberg: {
          titel: 'Hackerberg - Penthouse',
          beschreibung:
            '2-izbovy penthouse s velkorysym 35 m² balkonom, kuchynou, kupelnou a panoramatickym vyhladom. 2 jednolozkove postele v kazdej izbe.',
          details: 'Vlastny vstup, plne vybavena kuchyna a kupelna (vana aj sprcha)',
          zimmer: '2,5 izby',
          flaeche: '65 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Velky balkon, panoramaticky vyhlad, ticha poloha',
          features: [
            'Pracka so susickou v suterene',
            '2 jednolozkove postele v 1. izbe, 2 jednolozkove postele v 2. izbe (jedna Queen size)',
            'Bezplatne WiFi 150 Mbit/s',
            'Satelitna TV',
            'Parkovanie priamo pred domom',
            'Ticha obytna lokalita',
            'Nablizku: pivna zahrada, prirodne jazero na kupanie, obchody a banky'
          ],
          preis: '110 EUR/noc + 100 EUR zaverecne upratovanie'
        },
        kombi: {
          titel: 'Kombi balicek: Hackerberg + Fruehlingstrasse',
          beschreibung: 'Oba byty spolu. Idealne pre vacsie timy so 7-11 osobami.',
          internet: 'WiFi 100-150 Mbit/s',
          extras: 'Dva byty, dve kuchyne, dve kupelne',
          preis: 'Kombi balicek',
          galleries: {
            fruehling: 'Fruehlingstrasse',
            hackerberg: 'Hackerberg'
          }
        }
      }
    },
    bookingPage: {
      steps: {
        bookApartment: 'Rezervovat byt',
        chooseDates: 'Krok 1: Vyberte datum prichodu',
        availableApartments: 'Dostupne byty',
        chooseApartment: 'Krok 2: Vyberte byt',
        yourData: 'Vase udaje',
        companyAndContact: 'Krok 3: Firemne udaje a kontaktne informacie'
      }
    },
    impressumPage: { title: 'Pravne udaje' },
    datenschutzPage: { title: 'Vyhlasenie o ochrane udajov' },
    agbPage: { title: 'Vseobecne obchodne podmienky' },
    widerrufPage: { title: 'Pravo na odstupenie a formular na odstupenie' }
  },
  cs: {
    common: { selected: 'Aktivni' },
    home: {
      importantNote: 'Zvlast dulezite',
      featuresAndServices: 'Vybaveni a sluzby:',
      earlyBookingPriceHint: '*Pri vcasne rezervaci a {{count}} osobach.',
      availabilityHeadline: 'Dostupnost',
      galleryWithCount: '📷 Galerie ({{count}} obrazku)',
      bookingStartHint:
        '📅 Spustit rezervaci: V dalsim kroku vyberte pozadovany termin a zkontrolujte dostupnost obou bytu.'
    },
    directions: {
      title: 'Doprava',
      calculatorTitle: 'Zadejte stavbu a vypocitejte trasu',
      apartmentTitle: 'Byt Fruehlingstrasse',
      addressLabel: 'Adresa',
      country: 'Nemecko',
      byCarLabel: 'Prijezd autem',
      byCarText: 'Priblizne 30 minut od centra mesta',
      publicTransportLabel: 'Verejna doprava',
      publicTransportText: 'Stanice S-Bahn Stockdorf, linka S6 smer centrum',
      parkingLabel: 'Parkovani',
      parkingText: 'Parkovani zdarma na miste',
      keyHandoverLabel: 'Predani klicu',
      keyHandoverText: 'Predani klicu probiha vzdy na adrese Fruehlingstrasse.',
      openMaps: 'Otevrit trasu v Google Maps'
    },
    success: {
      title: 'Rezervace potvrzena!',
      confirmationPrefix: 'Dekuji za rezervaci. Potvrzovaci e-mail jsme poslali na',
      yourEmail: 'vasi e-mailovou adresu',
      confirmationSuffix: '.',
      nextStepsTitle: 'Dalsi kroky:',
      nextStepsText: 'Brzy obdrzite e-mail se vsemi informacemi a fakturou k rezervaci.',
      downloadInvoice: 'Stahnout fakturu',
      backHome: 'Zpet na uvodni stranku',
      tipTitle: 'Tip:',
      tipText: 'Pokud e-mail nevidite, zkontrolujte i slozku Spam nebo Nevyzadana posta.'
    },
    cancelPage: {
      title: 'Platba zrusena',
      subtitle: 'Vase rezervace nebyla dokoncena. Nebyla uctovana zadna castka.',
      retryTitle: 'Chcete to zkusit znovu?',
      retryText: 'Kliknete nize na "Nova rezervace" a spustte proces znovu.',
      newBooking: 'Nova rezervace',
      back: 'Zpet'
    },
    payment: {
      preparing: 'Priprava platby...',
      bookingDataMissing: 'Chyba: data rezervace nebyla nalezena',
      title: 'Zkontrolovat rezervaci',
      bookingDetails: 'Detaily rezervace',
      partialIntro: 'Rezervujete cele obdobi',
      nights: 'noci',
      partialHintPrefix: 'Prvni faktura je za',
      partialHintStrong: 'prvni 4 tydny (28 noci)',
      partialHintSuffix: 'Za zbytek obdobi obdrzite dalsi fakturu tyden predem.',
      apartmentLabel: 'Byt:',
      reservationPeriod: 'Obdobi rezervace:',
      payNowFirstWeeks: 'Nyni k uhrade (prvni 4 tydny):',
      periodLabel: 'Obdobi:',
      invoiceNights: 'Noci (tato faktura):',
      nightCount: 'Pocet noci:',
      peopleLabel: 'Osoby:',
      contactDetails: 'Kontaktni udaje',
      name: 'Jmeno:',
      email: 'E-mail:',
      mobile: 'Mobil:',
      landline: 'Pevna linka:',
      accommodationLine: 'Ubytovani ({{nights}} noci × {{price}}€):',
      monthlyCleaning: 'mesicni uklid',
      finalCleaning: 'zaverecny uklid',
      netTotal: 'Cista castka:',
      earlyDiscount: 'Sleva za vcasnou rezervaci (-10%):',
      vat: 'plus 7% DPH:',
      invoiceAmount: 'Castka faktury:',
      paymentMethod: 'Zpusob platby',
      paymentType: 'Typ platby',
      onInvoice: 'Na fakturu',
      onlyInvoiceHint: 'Poznamka: aktualne je mozna pouze platba na fakturu.',
      createBookingError: 'Rezervaci se nepodarilo vytvorit. Zkuste to prosim znovu.',
      connectionError: 'Chyba pripojeni. Zkontrolujte internetove pripojeni a zkuste to znovu.',
      processing: 'Zpracovavam rezervaci...',
      bookNow: 'Zavazne rezervovat nyni',
      invoiceByEmail: 'Po rezervaci obdrzite fakturu e-mailem.'
    },
    properties: {
      home: {
        hackerberg: {
          titel: 'Byt Krailling, Hackerberg - Penthouse',
          beschreibung: 'Penthouse 2,5 pokoje v 5. patre s vytahem a panoramatickym balkonem',
          preis: 'od 18 EUR za osobu/noc!',
          zimmer: '2,5 pokoje',
          flaeche: '65 m²',
          details: 'Vlastni vstup, plne vybavena kuchyn a koupelna (vana i sprcha)',
          features: [
            'Pracka se susickou ve sklepe',
            '2 jednoluzka v 1. pokoji, 2 jednoluzka ve 2. pokoji (jedno Queen size)',
            'WiFi 150 Mbit/s zdarma',
            'Satelitni TV',
            'Parkovani primo pred domem',
            'Klidna obytna lokalita',
            'Nedaleko: pivni zahrada, prirodni koupaliste, obchody a banky'
          ]
        },
        neubau: {
          titel: 'Byt Krailling, Fruehlingstrasse - Novostavba',
          beschreibung: 'Byt 2 pokoje s vlastnim vstupem a zahradou s moznosti grilovani',
          preis: 'od 16 EUR za osobu/noc!',
          zimmer: '2 pokoje',
          flaeche: '58 m²',
          details: 'Vlastni vstup, plne vybavena kuchyn a koupelna (vana i sprcha)',
          features: [
            'Pracka se susickou',
            '2 jednoluzka v kazdem pokoji (jedno Queen size)',
            'WiFi 150 Mbit/s zdarma',
            'Satelitni TV',
            'Parkovani pro osobni i nakladni auta s privesem pred domem',
            'Pouzivani zahrady s moznosti grilovani',
            'Klidna obytna lokalita',
            'Nedaleko: pivni zahrada, prirodni koupaliste, obchody a banky'
          ]
        }
      },
      booking: {
        neubau: {
          titel: 'Fruehlingstrasse - Novostavba',
          beschreibung:
            'Byt 2 pokoje s plne vybavenou kuchyni, koupelnou a zahradou s grilem. Idealni pro remeslniky a montery.',
          details: 'Vlastni vstup, plne vybavena kuchyn a koupelna (vana i sprcha)',
          zimmer: '2 pokoje',
          flaeche: '58 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Zahrada, gril, klidna poloha',
          features: [
            'Pracka se susickou',
            '3 jednoluzka v kazdem pokoji (jedno Queen size)',
            'WiFi 150 Mbit/s zdarma',
            'Satelitni TV',
            'Parkovani pro osobni i nakladni auta s privesem pred domem',
            'Pouzivani zahrady s moznosti grilovani',
            'Klidna obytna lokalita',
            'Nedaleko: pivni zahrada, prirodni koupaliste, obchody a banky'
          ],
          preis: '110 EUR/noc + 100 EUR zaverecny uklid'
        },
        hackerberg: {
          titel: 'Hackerberg - Penthouse',
          beschreibung:
            'Penthouse 2 pokoje s velkorysym balkonem 35 m², kuchyni, koupelnou a panoramatickym vyhledem. 2 jednoluzka v kazdem pokoji.',
          details: 'Vlastni vstup, plne vybavena kuchyn a koupelna (vana i sprcha)',
          zimmer: '2,5 pokoje',
          flaeche: '65 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Velky balkon, panoramaticky vyhled, klidna poloha',
          features: [
            'Pracka se susickou ve sklepe',
            '2 jednoluzka v 1. pokoji, 2 jednoluzka ve 2. pokoji (jedno Queen size)',
            'WiFi 150 Mbit/s zdarma',
            'Satelitni TV',
            'Parkovani primo pred domem',
            'Klidna obytna lokalita',
            'Nedaleko: pivni zahrada, prirodni koupaliste, obchody a banky'
          ],
          preis: '110 EUR/noc + 100 EUR zaverecny uklid'
        },
        kombi: {
          titel: 'Kombi balicek: Hackerberg + Fruehlingstrasse',
          beschreibung: 'Oba byty dohromady. Idealni pro vetsi tymy s 7-11 osobami.',
          internet: 'WiFi 100-150 Mbit/s',
          extras: 'Dva byty, dve kuchyne, dve koupelny',
          preis: 'Kombi balicek',
          galleries: {
            fruehling: 'Fruehlingstrasse',
            hackerberg: 'Hackerberg'
          }
        }
      }
    },
    bookingPage: {
      steps: {
        bookApartment: 'Rezervovat byt',
        chooseDates: 'Krok 1: Vyberte datum prijezdu',
        availableApartments: 'Dostupne byty',
        chooseApartment: 'Krok 2: Vyberte byt',
        yourData: 'Vase udaje',
        companyAndContact: 'Krok 3: Firemni udaje a kontaktni informace'
      }
    },
    impressumPage: { title: 'Pravni informace' },
    datenschutzPage: { title: 'Prohlaseni o ochrane osobnich udaju' },
    agbPage: { title: 'Vseobecne obchodni podminky' },
    widerrufPage: { title: 'Pravo na odstoupeni a formular odstoupeni' }
  },
  bg: {
    common: { selected: 'Aktiven' },
    home: {
      importantNote: 'Osobeno vazhno',
      featuresAndServices: 'Obzavezhdane i uslugi:',
      earlyBookingPriceHint: '*Pri rannata rezervaciya i {{count}} dushi.',
      availabilityHeadline: 'Nalichnosti',
      galleryWithCount: '📷 Galeriya ({{count}} snimki)',
      bookingStartHint:
        '📅 Startirai rezervaciya: V sledvashtata stapka izberete zhelaniya period i proverete nalichnostta na dvata apartamenta.'
    },
    directions: {
      title: 'Uputvane',
      calculatorTitle: 'Vavedi stroezha i izchisli marshruta',
      apartmentTitle: 'Apartament Fruehlingstrasse',
      addressLabel: 'Adres',
      country: 'Germaniya',
      byCarLabel: 'Pristigane s kola',
      byCarText: 'Okolo 30 minuti ot centro na grada',
      publicTransportLabel: 'GradskI transport',
      publicTransportText: 'S-Bahn spirka Stockdorf, liniya S6 kam centra',
      parkingLabel: 'Parkirane',
      parkingText: 'Bezplatno parkirane na myasto',
      keyHandoverLabel: 'Predavane na klyuchove',
      keyHandoverText: 'Predavaneto na klyuchovete vinagi e na Fruehlingstrasse.',
      openMaps: 'Otvori marshruta v Google Maps'
    },
    success: {
      title: 'Rezervaciyata e potvardena!',
      confirmationPrefix: 'Blagodarim za rezervaciyata. Izpratikhme potvarditel e-mail do',
      yourEmail: 'vashiya e-mail adres',
      confirmationSuffix: '.',
      nextStepsTitle: 'Sledvashti stapki:',
      nextStepsText: 'Skoro shte poluchite e-mail s vsichki podrobnosti i faktura za rezervaciyata.',
      downloadInvoice: 'Iztegli fakturata',
      backHome: 'Obratno kam nachalnata stranica',
      tipTitle: 'Savet:',
      tipText: 'Ako ne namirite e-maila, proverete i Spam ili Junk papkata.'
    },
    cancelPage: {
      title: 'Plashtaneto e prekasnato',
      subtitle: 'Rezervaciyata ne beshe zavarshena. Ne e natchislyavana suma.',
      retryTitle: 'Iskate li da opitate otnovo?',
      retryText: 'Natistnete "Nova rezervaciya" po-dolu, za da zapochnete protsesa otnovo.',
      newBooking: 'Nova rezervaciya',
      back: 'Nazad'
    },
    payment: {
      preparing: 'Podgotvya se plashtane...',
      bookingDataMissing: 'Greshka: dannite za rezervaciyata ne sa namereni',
      title: 'Proveri rezervaciyata',
      bookingDetails: 'Detayli za rezervaciyata',
      partialIntro: 'Rezervirate tseliya period',
      nights: 'noshtuvki',
      partialHintPrefix: 'Parvata faktura e za',
      partialHintStrong: 'parvite 4 sedmitsi (28 noshtuvki)',
      partialHintSuffix: 'Za ostanalIya period shte poluchite sledvashta faktura edna sedmitsa po-rano.',
      apartmentLabel: 'Apartament:',
      reservationPeriod: 'Period na rezervaciya:',
      payNowFirstWeeks: 'Za plashtane sega (parvite 4 sedmitsi):',
      periodLabel: 'Period:',
      invoiceNights: 'Noshtuvki (tazi faktura):',
      nightCount: 'Broi noshtuvki:',
      peopleLabel: 'Hora:',
      contactDetails: 'Kontakti',
      name: 'Ime:',
      email: 'E-mail:',
      mobile: 'Mobilen:',
      landline: 'Stacionaren:',
      accommodationLine: 'Nastanyavane ({{nights}} noshtuvki × {{price}}€):',
      monthlyCleaning: 'mesechno pochistvane',
      finalCleaning: 'finalno pochistvane',
      netTotal: 'Netna suma:',
      earlyDiscount: 'Otstapka za ranna rezervaciya (-10%):',
      vat: 'plus 7% DDS:',
      invoiceAmount: 'Suma po faktura:',
      paymentMethod: 'Metod na plashtane',
      paymentType: 'Vid plashtane',
      onInvoice: 'Po faktura',
      onlyInvoiceHint: 'Zabelezhka: v momenta e vazmozhno samo plashtane po faktura.',
      createBookingError: 'Ne uspyahme da sazdadem rezervaciyata. Molya, opitayte otnovo.',
      connectionError: 'Greshka vav vrazkata. Proverete interneta i opitayte pak.',
      processing: 'Obrabotka na rezervaciyata...',
      bookNow: 'Rezervirai sega s obvarzvasht efekt',
      invoiceByEmail: 'Sled rezervaciya shte poluchite faktura po e-mail.'
    },
    properties: {
      home: {
        hackerberg: {
          titel: 'Apartament Krailling, Hackerberg - Penthouse',
          beschreibung: '2,5-staen penthaus na 5-ti etazh s asansyor i panoramen balkon',
          preis: 'ot 18 EUR na chovek/nosht!',
          zimmer: '2,5 stai',
          flaeche: '65 m²',
          details: 'Samostoyatelen vhod, napalno oborudvana kuhnya i banya (vana i dush)',
          features: [
            'Peralnya sus sushilnya v suterena',
            '2 edinichni legla v staya 1, 2 edinichni legla v staya 2 (ednoto Queen size)',
            'Bezplaten WiFi 150 Mbit/s',
            'Satelitna televizIya',
            'Parkomesta tochno pred kashtata',
            'Tiha zhilishtna zona',
            'Nablizo: birena gradina, estestveno ezero za kapanE, magazini i banki'
          ]
        },
        neubau: {
          titel: 'Apartament Krailling, Fruehlingstrasse - Nova sgrada',
          beschreibung: '2-staen apartament sas samostoyatelen vhod i gradina s myasto za barbekyu',
          preis: 'ot 16 EUR na chovek/nosht!',
          zimmer: '2 stai',
          flaeche: '58 m²',
          details: 'Samostoyatelen vhod, napalno oborudvana kuhnya i banya (vana i dush)',
          features: [
            'Peralnya sus sushilnya',
            '2 edinichni legla vav vsyaka staya (ednoto Queen size)',
            'Bezplaten WiFi 150 Mbit/s',
            'Satelitna televizIya',
            'Parkirane za leki i tovarni avtomobili s remarke pred kashtata',
            'Polzvane na gradina s vazmozhnost za barbekyu',
            'Tiha zhilishtna zona',
            'Nablizo: birena gradina, estestveno ezero za kapanE, magazini i banki'
          ]
        }
      },
      booking: {
        neubau: {
          titel: 'Fruehlingstrasse - Nova sgrada',
          beschreibung:
            '2-staen apartament s napalno oborudvana kuhnya, banya i gradina s barbekyu. Idealno za spetsialisti i montyori.',
          details: 'Samostoyatelen vhod, napalno oborudvana kuhnya i banya (vana i dush)',
          zimmer: '2 stai',
          flaeche: '58 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Gradina, barbekyu, tiho myasto',
          features: [
            'Peralnya sus sushilnya',
            '3 edinichni legla vav vsyaka staya (ednoto Queen size)',
            'Bezplaten WiFi 150 Mbit/s',
            'Satelitna televizIya',
            'Parkirane za leki i tovarni avtomobili s remarke pred kashtata',
            'Polzvane na gradina s vazmozhnost za barbekyu',
            'Tiha zhilishtna zona',
            'Nablizo: birena gradina, estestveno ezero za kapanE, magazini i banki'
          ],
          preis: '110 EUR/nosht + 100 EUR finalno pochistvane'
        },
        hackerberg: {
          titel: 'Hackerberg - Penthouse',
          beschreibung:
            '2-staen penthaus s prostoren balkon 35 m², kuhnya, banya i panoramna gledka. 2 edinichni legla vav vsyaka staya.',
          details: 'Samostoyatelen vhod, napalno oborudvana kuhnya i banya (vana i dush)',
          zimmer: '2,5 stai',
          flaeche: '65 m²',
          internet: 'WiFi 150 Mbit/s',
          extras: 'Golqm balkon, panoramna gledka, tiho myasto',
          features: [
            'Peralnya sus sushilnya v suterena',
            '2 edinichni legla v staya 1, 2 edinichni legla v staya 2 (ednoto Queen size)',
            'Bezplaten WiFi 150 Mbit/s',
            'Satelitna televizIya',
            'Parkomesta tochno pred kashtata',
            'Tiha zhilishtna zona',
            'Nablizo: birena gradina, estestveno ezero za kapanE, magazini i banki'
          ],
          preis: '110 EUR/nosht + 100 EUR finalno pochistvane'
        },
        kombi: {
          titel: 'Kombi paket: Hackerberg + Fruehlingstrasse',
          beschreibung: 'Dvata apartamenta zaedno. Idealno za po-golemi ekipi ot 7-11 dushi.',
          internet: 'WiFi 100-150 Mbit/s',
          extras: 'Dva apartamenta, dve kuhni, dve bani',
          preis: 'Kombi paket',
          galleries: {
            fruehling: 'Fruehlingstrasse',
            hackerberg: 'Hackerberg'
          }
        }
      }
    },
    bookingPage: {
      steps: {
        bookApartment: 'Rezervirai apartament',
        chooseDates: 'Stapka 1: Izberete data za pristigane',
        availableApartments: 'Nalichni apartamenti',
        chooseApartment: 'Stapka 2: Izberete apartament',
        yourData: 'Vashite danni',
        companyAndContact: 'Stapka 3: Danni za firma i kontaktna informaciya'
      }
    },
    impressumPage: { title: 'Pravna informaciya' },
    datenschutzPage: { title: 'Deklaraciya za zashtita na dannite' },
    agbPage: { title: 'Obshti targovski usloviya' },
    widerrufPage: { title: 'Pravo na otkaz i formular za otkaz' }
  }
};

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

for (const [lang, patch] of Object.entries(updates)) {
  const localePath = path.join(localeDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  deepMerge(data, patch);
  fs.writeFileSync(localePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`updated ${lang}.json`);
}
