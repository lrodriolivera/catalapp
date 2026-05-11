'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Volume2, Mic, Send, Sparkles, Lightbulb, BarChart3, RefreshCw } from 'lucide-react'
import { sendConversaMessage } from '@/lib/api'
import { recordError } from '@/lib/errorLog'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/ui/Mascot'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  correction?: string
  correctedPhrase?: string
  error?: boolean
}

interface Scenario {
  key: string
  emoji: string
  title: string
  description: string
  starter: string
  suggestions: string[][]
}

interface ScenarioGroup {
  unitId: number
  unitTitle: string
  scenarios: Scenario[]
}

const scenarioGroups: ScenarioGroup[] = [
  { unitId: 1, unitTitle: 'Hola, com et dius?', scenarios: [
    { key: 'presentacions', emoji: '👋', title: 'Presentar-se', description: 'Dir el nom, edat i procedència', starter: "Hola! Jo soc la Clara. Com et dius? D'on ets?", suggestions: [['Hola, em dic...', 'Soc de...', 'Tinc ... anys'], ['Em dic Joan', 'Soc de Colòmbia', 'Visc a Barcelona'], ['Faig de programador', 'Tinc trenta anys', 'Encantada!']] },
    { key: 'telefon', emoji: '📞', title: 'Parlar per telèfon', description: 'Trucar i donar informació', starter: 'Ring ring! Hola, digui? Qui truca?', suggestions: [['Hola, soc en Joan', 'Puc parlar amb...?', 'Truco per...'], ['Quin número tens?', 'Et truco després', 'Un moment, si us plau'], ['Gràcies, adéu!', 'Fins demà!', "D'acord, perfecte"]] },
    { key: 'oficina', emoji: '🏢', title: 'A la feina', description: 'Presentar-se en un lloc de treball', starter: "Bon dia! Ets el nou treballador? Benvingut! Com et dius i de què fas?", suggestions: [['Soc enginyer', 'Treballo aquí des de...', 'Encantat!'], ['Faig de programador', 'La meva oficina és...', 'On és el bany?'], ['Moltes gràcies', 'A quina hora dinem?', 'Fins demà!']] },
  ]},
  { unitId: 2, unitTitle: 'Coneixes la meva família?', scenarios: [
    { key: 'familia', emoji: '👨‍👩‍👧', title: 'La meva família', description: 'Parlar dels membres de la família', starter: 'Hola! Avui parlarem de la família. Tens germans o germanes?', suggestions: [['Tinc un germà', 'La meva mare és...', 'No tinc germans'], ['El meu pare es diu...', 'Viuen a...', 'Tinc dos fills'], ['La meva família és gran', 'Són molt simpàtics', 'Tenen ... anys']] },
    { key: 'descriure', emoji: '🧑', title: 'Descriure persones', description: 'Característiques físiques i de caràcter', starter: "Avui practiquem les descripcions. Com ets tu? Descriu-te!", suggestions: [['Soc alt i prim', 'Tinc els ulls marrons', 'Soc simpàtic'], ['Tinc els cabells negres', 'Soc treballador', 'La meva amiga és rossa'], ['Ell és molt divertit', 'Ella és intel·ligent', 'Són molt macos']] },
    { key: 'felicitar', emoji: '🎂', title: 'Felicitar i convidar', description: 'Aniversaris, festes i invitacions', starter: "Hola! Saps que? Demà és el meu aniversari! Faig una festa!", suggestions: [['Per molts anys!', 'Quants anys fas?', 'On és la festa?'], ['A quina hora?', 'Porto alguna cosa?', 'Hi ve tothom?'], ['Enhorabona!', 'Serà genial!', 'Ens veiem allà!']] },
  ]},
  { unitId: 3, unitTitle: 'On vius?', scenarios: [
    { key: 'habitatge', emoji: '🏠', title: 'El meu pis', description: 'Descriure on vius i les habitacions', starter: 'Bon dia! On vius? Jo visc en un pis a Barcelona, al centre.', suggestions: [['Visc a Barcelona', 'Tinc un pis', 'Al segon pis'], ['Hi ha tres habitacions', 'La cuina és gran', 'Té terrassa'], ['El meu barri és tranquil', 'Hi ha botigues a prop', "M'agrada molt"]] },
    { key: 'barri', emoji: '🏘️', title: 'El meu barri', description: 'Serveis, botigues i llocs del barri', starter: "Hola! Parlem del teu barri. Què hi ha a prop de casa teva?", suggestions: [['Hi ha un supermercat', 'A prop hi ha un parc', 'El metro és al costat'], ['Hi ha una farmàcia', 'No hi ha hospital', 'Hi ha moltes botigues'], ["M'agrada el barri", 'És tranquil', 'Hi ha de tot']] },
    { key: 'buscar_pis', emoji: '🔑', title: 'Buscar pis', description: 'Preguntar per un pis de lloguer', starter: "Bon dia! Truco per l'anunci del pis. Encara està disponible?", suggestions: [['Quantes habitacions té?', 'Hi ha ascensor?', 'Quin pis és?'], ['Quant val el lloguer?', 'Hi ha terrassa?', 'Les despeses estan incloses?'], ['Puc anar a veure-el?', 'A quina hora?', 'Moltes gràcies!']] },
  ]},
  { unitId: 4, unitTitle: 'Què fas cada dia?', scenarios: [
    { key: 'rutina', emoji: '⏰', title: 'La rutina diària', description: 'Explicar què fas cada dia', starter: 'Bon dia! Què fas normalment cada dia? A quina hora et lleves?', suggestions: [['Em llevo a les set', 'Esmorzo a les vuit', 'Treballo de nou a cinc'], ['Dino a les dues', 'Estudio al vespre', 'Sopo a les nou'], ['Els dissabtes descanso', 'Vaig al gimnàs', 'Passejo pel parc']] },
    { key: 'hores', emoji: '🕐', title: 'Les hores', description: 'Practicar a dir i preguntar les hores', starter: "Hola! Practiquem les hores en català. Quina hora és ara?", suggestions: [['Són les nou en punt', 'És un quart de deu', 'Són dos quarts de deu'], ['A quina hora comences?', 'A les vuit del matí', 'Són tres quarts de cinc'], ['Quina hora és?', 'Falten cinc minuts', 'Són les dues en punt']] },
    { key: 'cap_setmana', emoji: '🌤️', title: 'El cap de setmana', description: 'Parlar del que fas els caps de setmana', starter: "Hola! Què fas normalment els caps de setmana? T'agrada sortir?", suggestions: [['Dissabte em llevo tard', 'Vaig al mercat', 'Surto amb amics'], ['Diumenge descanso', 'Cuino a casa', 'Passejo per la platja'], ['Sempre vaig al cinema', 'De vegades llegeixo', 'Mai treballo el diumenge']] },
  ]},
  { unitId: 5, unitTitle: "T'agrada el cinema?", scenarios: [
    { key: 'gustos', emoji: '❤️', title: 'Gustos i preferències', description: "Parlar del que t'agrada i no t'agrada", starter: "Hola! Parlem dels nostres gustos. Què t'agrada fer en el teu temps lliure?", suggestions: [["M'agrada el cinema", "M'encanta llegir", "Prefereixo la platja"], ["No m'agrada el futbol", "M'agrada molt cuinar", "M'agraden els museus"], ["A mi també!", "Prefereixo passejar", "M'encanta la música"]] },
    { key: 'quedar', emoji: '🎬', title: 'Quedar amb amics', description: 'Fer plans i quedar per sortir', starter: "Ei! Vols fer alguna cosa aquest cap de setmana? Podem anar a algun lloc!", suggestions: [['Vols venir al cinema?', 'Podem anar a la platja', 'A quina hora quedem?'], ['Prefereixo el teatre', 'Puc anar en metro', 'Quedem a les cinc?'], ["D'acord! Perfecte!", 'On ens trobem?', 'Compro els bitllets']] },
    { key: 'transport', emoji: '🚇', title: 'El transport', description: 'Com arribar als llocs amb transport públic', starter: "Hola! Necessito anar al centre de Barcelona. Com puc arribar-hi?", suggestions: [['Agafa el metro', "L'autobús passa cada deu minuts", 'Pots anar a peu'], ['Quina línia és?', 'On és la parada?', 'Tens la T-Casual?'], ['Vaig en bici', 'Prefereixo el tren', 'El taxi és car']] },
  ]},
  { unitId: 6, unitTitle: 'Anem a comprar', scenarios: [
    { key: 'comprar', emoji: '🛒', title: 'Comprar al mercat', description: 'Demanar productes, quantitats i preus', starter: "Bon dia! Benvingut al mercat de la Boqueria! Què voldria?", suggestions: [['Em posa un quilo de...', 'Quant val?', 'Alguna cosa més?'], ['Vull mig quilo de...', "Les maduixes estan d'oferta?", 'Això és tot'], ['Necessito pa i llet', 'Quant és tot plegat?', 'Vol bossa?']] },
    { key: 'aliments', emoji: '🥘', title: 'Els meus àpats', description: 'Parlar del que menges i beus', starter: "Hola! Parlem del menjar. Què menges normalment per esmorzar?", suggestions: [['Esmorzo cafè amb llet', 'Menjo pa amb tomàquet', 'Bec suc de taronja'], ['Dino arròs amb verdura', "M'agrada el peix", 'Sopo amanida'], ['Cuino cada dia', 'Compro al mercat', 'La fruita és barata']] },
    { key: 'receptes', emoji: '👨‍🍳', title: 'Cuinar un plat', description: "Explicar els ingredients d'una recepta", starter: "Hola! Vull cuinar un plat típic avui. Tu saps cuinar? Què necessito per fer una amanida?", suggestions: [['Necessites tomàquets', 'Compra enciam i ceba', "Oli d'oliva i sal"], ['Un quilo de patates', 'Mig quilo de pollastre', "Una dotzena d'ous"], ['El formatge és car', 'Les verdures són fresques', 'La carn és barata al mercat']] },
  ]},
  { unitId: 7, unitTitle: 'Què vol prendre?', scenarios: [
    { key: 'restaurant', emoji: '🍽️', title: 'Al restaurant', description: 'Demanar menjar i beure', starter: "Bona tarda! Benvinguts al restaurant. Aquí tenen la carta. Què volen prendre?", suggestions: [['Voldria el menú del dia', 'De primer, una sopa', 'Per beure, un vi negre'], ['Què recomana de segon?', 'El peix a la planxa', 'Per a mi una amanida'], ['El compte, si us plau', 'Està molt bo!', 'Bon profit!']] },
    { key: 'plats_catalans', emoji: '🥘', title: 'Plats catalans', description: 'Conèixer i recomanar plats típics', starter: "Hola! Coneixes els plats típics catalans? Quin és el teu preferit?", suggestions: [["M'agrada el pa amb tomàquet", 'La crema catalana és fantàstica', "Què és l'escalivada?"], ["M'encanta la botifarra", 'La fideuà és molt bona', 'Vull provar els calçots'], ["Recomano l'esqueixada", "L'escudella és per a l'hivern", 'Bon profit!']] },
    { key: 'feina_restaurant', emoji: '💼', title: 'La feina', description: 'Parlar de la feina i condicions laborals', starter: "Hola! De què treballes? Jo treballo de cambrer en un restaurant del centre.", suggestions: [['Treballo de cuiner', 'Tinc jornada completa', 'El meu sou és bo'], ['Treballo de cambrer', 'Tinc mitja jornada', 'Tinc els caps de setmana lliures'], ["M'agrada treballar de cara al públic", 'Tinc contracte fix', 'Les vacances són al juliol']] },
  ]},
  { unitId: 8, unitTitle: 'Ens movem per la ciutat', scenarios: [
    { key: 'indicacions', emoji: '🗺️', title: 'Demanar indicacions', description: 'Com arribar a un lloc de la ciutat', starter: "Perdoni! Estic perdut. Sap on és la Sagrada Família?", suggestions: [['Gira a la dreta', 'Continua recte', 'Creua la plaça'], ["On és l'estació de metro?", 'Queda lluny?', 'Quants minuts a peu?'], ["A la primera a l'esquerra", 'Al final del carrer', 'Al costat de la farmàcia']] },
    { key: 'serveis', emoji: '🏥', title: 'Serveis de la ciutat', description: 'Trobar serveis públics al teu barri', starter: "Hola! Soc nou al barri i necessito trobar alguns serveis. On és l'hospital?", suggestions: [['On és el CAP?', 'Hi ha una comissaria?', 'On és correus?'], ["L'hospital és a prop", 'La biblioteca és al costat', "L'ajuntament és al centre"], ['Necessito anar al metge', 'On és la farmàcia?', 'Hi ha una escola a prop?']] },
    { key: 'emergencia', emoji: '🚨', title: 'Emergències', description: "Actuar en una situació d'emergència", starter: "Emergència! Que ha passat? Has vist un accident? Necessites ajuda?", suggestions: [['Necessito una ambulància!', 'Hi ha un accident!', 'Truqueu al 112!'], ['Estic perdut', "On és l'hospital?", 'Necessito ajuda'], ['Hi ha foc!', 'Necessito la policia', 'On són els bombers?']] },
  ]},
  { unitId: 9, unitTitle: 'Què necessito?', scenarios: [
    { key: 'tramits', emoji: '🏛️', title: 'Fer tràmits', description: 'Empadronar-se, targeta sanitària, NIE', starter: "Bon dia! Benvingut a l'oficina d'atenció ciutadana. En què el puc ajudar?", suggestions: [['Necessito empadronar-me', 'Quins documents necessito?', "He d'omplir un formulari?"], ['Vull fer la targeta sanitària', 'Tinc cita a les deu', 'On he de signar?'], ['Quant de temps triga?', 'Puc demanar cita per internet?', 'Gràcies per la informació']] },
    { key: 'metge', emoji: '🏥', title: 'Al metge', description: 'Explicar símptomes i demanar cita', starter: "Bon dia! Soc el doctor Garcia. Com es troba? Què li passa?", suggestions: [['Em fa mal el cap', 'Tinc febre i tos', 'Em trobo malament'], ['Estic refredat', 'Necessito una recepta', 'Des de quan?'], ['Des de fa dos dies', "M'he pres un paracetamol", 'Gràcies, doctor']] },
    { key: 'documents', emoji: '📄', title: 'Documents', description: 'Parlar de documents i papers necessaris', starter: "Hola! Acabes d'arribar a Barcelona? Necessites ajuda amb els papers i documents?", suggestions: [['Necessito el NIE', 'On demano el certificat?', 'He de portar el passaport'], ['Com obro un compte bancari?', 'Necessito el contracte de lloguer', "On és l'oficina d'estrangeria?"], ['Tinc el número de la SS', "He d'omplir el formulari", 'Quins papers necessito?']] },
  ]},
  { unitId: 10, unitTitle: 'Qui és qui?', scenarios: [
    { key: 'descripcions', emoji: '👤', title: 'Descriure persones', description: 'Aspecte físic, caràcter i roba', starter: "Hola! Avui practicarem les descripcions. Com ets tu? Descriu-te!", suggestions: [['Soc alt i prim', 'Tinc els cabells morens', 'Porto una samarreta blava'], ['Soc simpàtic i divertit', 'La meva amiga és rossa', 'Ell porta pantalons negres'], ['Sembla molt amable', 'És jove i extravertida', 'Té els ulls marrons']] },
    { key: 'roba', emoji: '👗', title: 'La roba', description: 'Parlar de roba, colors i talles', starter: "Ei! Anem de compres! Què necessites comprar? Quins colors t'agraden?", suggestions: [['Necessito una jaqueta', "M'agrada el color blau", 'Quina talla portes?'], ['Vull uns texans negres', 'Les vambes blanques', "L'abric vermell és bonic"], ['Quant val la faldilla?', 'És massa car!', 'El vestit verd és molt bonic']] },
    { key: 'formal', emoji: '🤝', title: 'Formal i informal', description: 'Practicar el registre formal i informal', starter: "Bon dia. Soc el senyor Garcia, el director. Vostè és el nou treballador?", suggestions: [['Sí, em dic...', 'Encantat de conèixer-lo', 'Com es diu vostè?'], ['Li presento el meu company', 'Vingui, segui', 'Molt de gust'], ['El meu telèfon és...', 'Treballo de...', 'Gràcies, senyor Garcia']] },
  ]},
  { unitId: 11, unitTitle: 'El pis a punt', scenarios: [
    { key: 'pis', emoji: '🔧', title: 'Problemes al pis', description: 'Explicar avaries i trucar al propietari', starter: "Hola! Soc el propietari. Em diu que hi ha un problema al pis?", suggestions: [['La rentadora no funciona', "S'ha espatllat la nevera", 'No hi ha aigua calenta'], ["Hi ha una fuita d'aigua", 'La calefacció no va', 'No hi ha llum'], ['Pot enviar un tècnic?', 'Quan pot venir?', 'Gràcies, espero la seva trucada']] },
    { key: 'tasques', emoji: '🧹', title: 'Tasques de la llar', description: 'Parlar de les tasques i la seva freqüència', starter: "Hola! Parlem de les tasques de casa. Qui neteja a casa teva? Cada quant?", suggestions: [['Netejo cada dia', "Passo l'aspiradora", 'Fregar els plats'], ['Rento la roba dos cops', 'He de planxar', 'Trec les escombraries'], ['Un cop per setmana', 'Gairebé mai', 'Cada quinze dies']] },
    { key: 'electrodomestics', emoji: '🏠', title: 'Electrodomèstics', description: "Comprar i parlar d'electrodomèstics", starter: "Bon dia! Benvingut a la botiga d'electrodomèstics. En què el puc ajudar?", suggestions: [['Necessito una rentadora', 'Quant val aquesta nevera?', 'Té microones?'], ['Vull un rentaplats', 'És massa car!', 'Hi ha ofertes?'], ['Funciona bé?', 'Té garantia?', "Me'l poden portar a casa?"]] },
  ]},
  { unitId: 12, unitTitle: 'Avui és festa!', scenarios: [
    { key: 'festes', emoji: '🎉', title: 'Festes catalanes', description: 'Parlar de festes i tradicions', starter: "Hola! Saps quines festes es celebren a Catalunya? Quina t'agrada més?", suggestions: [["M'agrada Sant Jordi", 'La nit de Sant Joan!', 'La Mercè és genial'], ['Què es fa per Nadal?', 'Què és un correfoc?', "M'agraden els castells"], ['Per molts anys!', 'Bones festes!', 'Feliç any nou!']] },
    { key: 'tradicions', emoji: '🏰', title: 'Tradicions', description: 'Descobrir tradicions i cultura catalana', starter: "Coneixes les tradicions catalanes? Saps què és una calçotada?", suggestions: [['Què és un castell?', "M'agrada la sardana", 'Què és el tió?'], ['Vaig veure els gegants', 'El correfoc és increïble', 'Vull anar a una festa major'], ['La senyera és la bandera', 'Gaudí és molt famós', "M'encanta Montserrat"]] },
    { key: 'celebrar', emoji: '🥂', title: 'Celebrar i felicitar', description: 'Felicitar i celebrar esdeveniments', starter: "Enhorabona! Avui és un dia especial? Què celebrem?", suggestions: [['Per molts anys!', 'Bon Nadal!', 'Enhorabona!'], ['Bona nit de Sant Joan!', 'Bones festes!', 'Felicitats!'], ['Feliç any nou!', 'Bona sort!', 'Ens ho passem molt bé!']] },
  ]},
  { unitId: 13, unitTitle: 'Ens formem', scenarios: [
    { key: 'formacio', emoji: '🎓', title: 'Estudis i formació', description: 'Parlar dels estudis i experiència', starter: "Hola! Estudies o treballes? Què has estudiat?", suggestions: [['He estudiat enginyeria', 'Estudio català al CPNL', 'Vull aprendre més'], ['He treballat de...', 'Tinc experiència en...', "M'agradaria estudiar..."], ['Lany que ve vull...', 'El meu objectiu és...', 'Penso fer un curs']] },
    { key: 'idiomes', emoji: '🗣️', title: 'Aprendre idiomes', description: 'Parlar de llengües i aprenentatge', starter: "Quantes llengües parles? Com aprens català? Quin idioma voldries aprendre?", suggestions: [['Parlo castellà i anglès', 'Aprenc català al CPNL', 'Llegeixo en català'], ['Escric cada dia', 'Escolto podcasts', 'Parlo amb amics catalans'], ["M'agradaria parlar millor", 'He après molt', 'El català és bonic']] },
    { key: 'futur', emoji: '💭', title: 'Plans de futur', description: 'Parlar de plans i objectius', starter: "Quins plans tens per al futur? Què t'agradaria fer?", suggestions: [['Vull acabar el curs', "M'agradaria trobar feina", 'Penso estudiar més'], ["L'any que ve vull...", 'El meu somni és...', 'Vull millorar el català'], ['He pensat en...', "M'agradaria viatjar", 'Vull quedar-me a Barcelona']] },
  ]},
  { unitId: 14, unitTitle: 'Anem a comprar (ampliació)', scenarios: [
    { key: 'compres_roba', emoji: '👗', title: 'Comprar roba', description: 'Provar-se roba, talles i preus', starter: "Bon dia! Benvinguda a la botiga. En què la puc ajudar? Busca alguna cosa?", suggestions: [['Vull provar-me aquesta faldilla', 'Quina talla és?', 'Té una talla més gran?'], ['Em queda bé?', 'On és el vestidor?', 'Quant val?'], ['És massa car', 'Hi ha rebaixes?', 'El puc tornar?']] },
    { key: 'rebaixes', emoji: '🏷️', title: 'Les rebaixes', description: 'Buscar ofertes i comparar preus', starter: "Avui hi ha rebaixes! Tot a meitat de preu. Vols venir a mirar?", suggestions: [['Quina oferta!', 'Això és molt barat', 'Prefereixo el blau'], ["És més bonic que l'altre", 'El vermell em queda millor', 'Massa car!'], ["El compro perquè m'agrada", 'Accepten targeta?', "Me'l quedo!"]] },
    { key: 'canviar', emoji: '🔄', title: 'Canviar o tornar', description: 'Tornar o canviar una compra', starter: "Bon dia. Necessita ajuda? Vol canviar alguna cosa?", suggestions: [['Vull canviar aquesta peça', 'No em queda bé', 'Té el tiquet?'], ['Vull una talla més gran', 'Prefereixo un altre color', 'El puc tornar?'], ['Tinc el tiquet aquí', 'Quan caduca?', "Gràcies per l'ajuda"]] },
  ]},
  { unitId: 15, unitTitle: 'Com et trobes?', scenarios: [
    { key: 'salut', emoji: '🏥', title: 'Salut i símptomes', description: 'Explicar com et trobes i símptomes', starter: "Hola! Com et trobes avui? Tens bona cara... o no gaire?", suggestions: [['Em trobo malament', 'Em fa mal el cap', 'Tinc febre'], ['Estic refredat', 'Tinc mal de panxa', 'Estic cansat'], ['He pres un paracetamol', "He d'anar al metge", 'Necessito descansar']] },
    { key: 'habits', emoji: '💪', title: 'Hàbits saludables', description: 'Parlar de dieta, exercici i salut', starter: "Parlem de salut! Fas exercici? Menges bé? Dorms prou?", suggestions: [['Camino cada dia', 'Menjo molta fruita', 'Dormo vuit hores'], ['Faig yoga', 'Bec molta aigua', 'No fumo'], ['He de fer més esport', "M'agrada córrer", 'Intento menjar sa']] },
    { key: 'farmacia', emoji: '💊', title: 'A la farmàcia', description: 'Comprar medicaments i demanar consell', starter: "Bon dia! Benvingut a la farmàcia. En què el puc ajudar?", suggestions: [['Tinc mal de cap', 'Necessito paracetamol', 'Tinc al·lèrgia'], ['Quantes pastilles he de prendre?', 'Necessito recepta?', 'Cada quantes hores?'], ['Gràcies pel consell', 'Quant val?', 'Tinc la targeta sanitària']] },
  ]},
  { unitId: 16, unitTitle: 'Sortim!', scenarios: [
    { key: 'sortir', emoji: '🏛️', title: 'Visitar Barcelona', description: "Recomanar i visitar llocs d'interès", starter: "Hola! Vols sortir avui? Què t'agradaria visitar a Barcelona?", suggestions: [['Vull visitar la Sagrada Família', 'Anem al Parc Güell?', "M'agrada el Barri Gòtic"], ['Podem anar a Montjuïc', 'El Born és molt bonic', 'La Barceloneta!'], ['Fa bon temps avui', 'Fem un pícnic?', 'Vols fer fotos?']] },
    { key: 'temps', emoji: '☀️', title: 'El temps', description: 'Parlar del temps meteorològic', starter: "Quin temps fa avui? Fa sol o plou? Sortim o ens quedem a casa?", suggestions: [['Fa sol i calor', 'Plou una mica', 'Fa molt de vent'], ['Fa bon temps per passejar', 'Fa fred, porto abric', 'Està ennuvolat'], ["A l'estiu fa molta calor", "A l'hivern fa fred", 'La primavera és bonica']] },
    { key: 'excursio', emoji: '⛰️', title: 'Fer una excursió', description: 'Planejar una excursió fora de Barcelona', starter: "Aquest cap de setmana vull fer una excursió. Vols venir? On anem?", suggestions: [['Anem a Montserrat!', 'Podem fer senderisme', "Porto l'esmorzar"], ['A quina hora sortim?', 'Com hi anem?', 'Quant de temps és?'], ['Fa bon temps per sortir', 'Porto aigua i fruita', 'Serà genial!']] },
  ]},
  { unitId: 17, unitTitle: 'Tinc una entrevista!', scenarios: [
    { key: 'entrevista', emoji: '💼', title: 'Entrevista de treball', description: 'Practicar una entrevista en català', starter: "Bon dia, segui si us plau. Soc la directora de recursos humans. Per què vol treballar aquí?", suggestions: [['Tinc experiència en...', 'He treballat de...', 'Parlo tres idiomes'], ['Soc responsable i puntual', 'Treballo bé en equip', "M'agrada aprendre"], ['Quan puc començar?', "Quin és l'horari?", 'Quines condicions té?']] },
    { key: 'cv', emoji: '📄', title: 'El currículum', description: 'Parlar de la teva experiència i formació', starter: "Explica'm el teu currículum. Què has estudiat? On has treballat?", suggestions: [['He estudiat enginyeria', 'He treballat cinc anys', 'Sé parlar català'], ['Tinc el certificat A1', 'He fet pràctiques', "Sé fer servir l'ordinador"], ['El meu punt fort és...', 'Vull créixer professionalment', "Tinc ganes d'aprendre"]] },
    { key: 'buscar_feina', emoji: '🔍', title: 'Buscar feina', description: 'Parlar de com busques feina', starter: "Hola! Busques feina? Com la busques? Què t'agradaria trobar?", suggestions: [["Busco feina d'enginyer", 'Miro ofertes per internet', 'He enviat el CV'], ['Vull jornada completa', "M'agradaria teletreball", 'El sou és important'], ['Tinc una entrevista demà', 'Espero trobar feina aviat', 'Barcelona té moltes oportunitats']] },
  ]},
  { unitId: 18, unitTitle: 'Tinc temps lliure', scenarios: [
    { key: 'oci', emoji: '🎭', title: 'Oci i cultura', description: 'Activitats culturals i temps lliure', starter: "Hola! Què t'agrada fer en el teu temps lliure? Vas a concerts, teatre...?", suggestions: [["M'encanten els concerts", 'Vaig al teatre sovint', "M'agrada visitar exposicions"], ["Tinc ganes d'anar al festival", 'Vull veure una obra', 'Estic interessat en el taller'], ['Gaudeixo molt de la cultura', 'Barcelona té molt a oferir', 'Descobreixo coses noves']] },
    { key: 'centre_civic', emoji: '🏫', title: 'Centre cívic', description: "Inscriure's a activitats", starter: "Bon dia! Benvingut al centre cívic. Tenim moltes activitats. Què li interessa?", suggestions: [["Vull inscriure'm al curs de pintura", 'Hi ha yoga?', "M'interessa la fotografia"], ['Quin horari té?', 'Quant costa?', 'Quan comença?'], ["M'hi apunto!", 'Tinc ganes de començar', 'Gràcies per la informació']] },
    { key: 'final_curs', emoji: '🎓', title: 'Final del curs', description: 'Celebrar i reflexionar sobre el curs A1', starter: "Enhorabona! Has acabat el curs A1 de català! Com ha estat l'experiència? Què has après?", suggestions: [['He après molt de català!', 'Ara parlo millor', "M'ha agradat el curs"], ['Vull continuar estudiant', 'El nivell A2 és el següent', 'Gràcies a tots!'], ["Barcelona m'encanta", 'Tinc molts amics catalans', 'El català és una llengua bonica']] },
  ]},
]

export default function ConversaPage() {
  const [selected, setSelected] = useState<Scenario | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioMode, setAudioMode] = useState(false)
  const [hasSR, setHasSR] = useState(false)
  const [hasTTS, setHasTTS] = useState(false)
  const [suggestionSet, setSuggestionSet] = useState(0)
  const [showEvaluation, setShowEvaluation] = useState(false)
  const [evaluation, setEvaluation] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const pendingTranscriptRef = useRef<string>('')
  const audioModeRef = useRef(audioMode)
  const sendDirectRef = useRef<(text: string) => void>(() => {})
  useEffect(() => { audioModeRef.current = audioMode }, [audioMode])

  useEffect(() => {
    setHasSR(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
    setHasTTS(typeof speechSynthesis !== 'undefined')
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.getVoices()
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices()
    }
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isTyping])

  const getBestVoice = useCallback(() => {
    const v = speechSynthesis.getVoices()
    return (
      v.find((x) => x.lang.startsWith('ca') && x.name.includes('Google')) ||
      v.find((x) => x.lang.startsWith('ca')) ||
      v.find((x) => x.lang === 'es-ES' && x.name.includes('Google')) ||
      null
    )
  }, [])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!text || !hasTTS) { onEnd?.(); return }
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ca-ES'
      u.rate = 0.82
      u.pitch = 1.0
      const v = getBestVoice()
      if (v) u.voice = v
      setIsSpeaking(true)
      u.onend = () => { setIsSpeaking(false); onEnd?.() }
      u.onerror = () => { setIsSpeaking(false); onEnd?.() }
      speechSynthesis.speak(u)
    },
    [getBestVoice, hasTTS],
  )

  const startListening = useCallback(() => {
    if (!hasSR) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    if (recognitionRef.current) { try { recognitionRef.current.abort() } catch {} }
    const r = new SR()
    r.lang = 'ca-ES'
    r.interimResults = false
    r.maxAlternatives = 1
    r.continuous = false
    recognitionRef.current = r
    pendingTranscriptRef.current = ''
    setIsRecording(true)
    r.onresult = (e: SpeechRecognitionEvent) => {
      pendingTranscriptRef.current = e.results[0][0].transcript
    }
    r.onerror = () => setIsRecording(false)
    r.onend = () => {
      setIsRecording(false)
      const text = pendingTranscriptRef.current
      if (text) {
        if (audioModeRef.current) sendDirectRef.current(text)
        else setInput(text)
      }
    }
    r.start()
  }, [hasSR])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
  }, [])

  const speakCorrection = useCallback(
    (phrase: string) => {
      if (!hasTTS) return
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(phrase)
      u.lang = 'ca-ES'
      u.rate = 0.7
      u.pitch = 1.0
      const v = getBestVoice()
      if (v) u.voice = v
      setIsSpeaking(true)
      u.onend = () => setIsSpeaking(false)
      u.onerror = () => setIsSpeaking(false)
      speechSynthesis.speak(u)
    },
    [getBestVoice, hasTTS],
  )

  const sendDirect = useCallback(
    async (text: string) => {
      if (!text.trim() || !selected) return
      setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text.trim() }])
      setInput('')
      setIsTyping(true)
      setSuggestionSet((prev) => (prev + 1) % 3)
      const history = [
        ...messages.map((m) => ({ role: m.role === 'system' ? 'assistant' : m.role, content: m.content })),
        { role: 'user' as const, content: text.trim() },
      ]
      try {
        const data = await sendConversaMessage(history, selected.key)
        const aMsg: Message = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          correction: data.correction || undefined,
          correctedPhrase: data.correction || undefined,
        }
        setMessages((prev) => [...prev, aMsg])
        if (data.correction) {
          recordError({
            context: selected.key,
            userAnswer: text.trim(),
            correctAnswer: data.correction,
            source: 'conversa',
          })
        }
        if (audioMode) {
          speak(data.response, () => {
            if (data.correction) setTimeout(() => speakCorrection(data.correction!), 400)
          })
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'assistant', content: 'Error de connexió.', error: true },
        ])
      } finally {
        setIsTyping(false)
      }
    },
    [selected, messages, audioMode, speak, speakCorrection],
  )

  useEffect(() => { sendDirectRef.current = sendDirect }, [sendDirect])
  const sendMessage = useCallback(() => sendDirect(input), [input, sendDirect])

  const startConversation = useCallback(
    (s: Scenario) => {
      setSelected(s)
      setSuggestionSet(0)
      setShowEvaluation(false)
      setEvaluation('')
      setMessages([{ id: 'starter', role: 'assistant', content: s.starter }])
      if (audioMode) setTimeout(() => speak(s.starter), 300)
    },
    [audioMode, speak],
  )

  const evaluateConversation = useCallback(async () => {
    if (!selected || messages.length < 3) return
    setIsEvaluating(true)
    const history = messages.map((m) => ({ role: m.role === 'system' ? 'assistant' : m.role, content: m.content }))
    try {
      const data = await sendConversaMessage(
        [
          ...history,
          {
            role: 'user',
            content:
              'AVALUACIÓ: Avalua la meva participació en aquesta conversa. Dona una nota del 1 al 10, destaca els errors que he comès, i per cada error dona la frase correcta en català. Format: primer la nota, després els errors amb correccions, i finalment un consell.',
          },
        ],
        selected.key,
      )
      setEvaluation(data.response)
      setShowEvaluation(true)
      if (audioMode && hasTTS) speak(data.response)
    } catch {
      setEvaluation('No he pogut avaluar la conversa. Torna a provar.')
      setShowEvaluation(true)
    } finally {
      setIsEvaluating(false)
    }
  }, [selected, messages, audioMode, hasTTS, speak])

  const goBack = useCallback(() => {
    speechSynthesis.cancel()
    if (recognitionRef.current) try { recognitionRef.current.stop() } catch {}
    setSelected(null)
    setMessages([])
    setInput('')
    setIsTyping(false)
    setIsRecording(false)
    setIsSpeaking(false)
    setShowEvaluation(false)
    setEvaluation('')
  }, [])

  const currentSuggestions = selected
    ? selected.suggestions[suggestionSet] || selected.suggestions[0]
    : []

  const container = 'mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12'

  // ══ SCENARIO SELECTION ══
  if (!selected) {
    return (
      <div className={container}>
        <header className="mb-8">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-2">
            Pràctica oral
          </p>
          <div className="flex items-center gap-3 mb-3">
            <Mascot expression="happy" size="sm" />
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight ">Conversa</h1>
          </div>
          <p className="text-lg text-ink-soft">
            Practica parlant català amb intel·ligència artificial.
          </p>
        </header>

        {hasSR ? (
          <div className="flex items-center justify-between bg-paper border-2 border-line rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">🎙️</span>
              <div>
                <p className="text-base font-bold text-ink">Mode conversa per veu</p>
                <p className="text-sm text-ink-muted">Mantén premut el botó mentre parles.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAudioMode((prev) => !prev)}
              aria-label={audioMode ? 'Desactivar mode veu' : 'Activar mode veu'}
              aria-pressed={audioMode}
              className={cn(
                'relative w-14 h-8 rounded-full transition-colors shrink-0',
                audioMode ? 'bg-accent' : 'bg-paper-4',
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-6 h-6 bg-ink-inverse rounded-full shadow transition-transform',
                  audioMode ? 'translate-x-7' : 'translate-x-1',
                )}
              />
            </button>
          </div>
        ) : (
          <div className="bg-warning-soft rounded-2xl p-5 mb-8 flex gap-3 items-start">
            <Lightbulb size={18} strokeWidth={2} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-base text-warning">
              Usa <strong>Chrome</strong> o <strong>Edge</strong> per la millor experiència amb veu.
            </p>
          </div>
        )}

        <div className="space-y-8">
          {scenarioGroups.map((group) => (
            <section key={group.unitId}>
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white text-base font-extrabold">
                  {group.unitId}
                </span>
                <p className="text-base font-bold text-ink">{group.unitTitle}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.scenarios.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => startConversation(s)}
                    className="text-left bg-paper border-2 border-line rounded-2xl p-5 hover:border-accent/50 hover:bg-paper-2 transition-colors focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="shrink-0 w-11 h-11 rounded-xl bg-accent-soft flex items-center justify-center text-xl leading-none"
                        aria-hidden="true"
                      >
                        {s.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-ink mb-1">{s.title}</p>
                        <p className="text-sm text-ink-muted">{s.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    )
  }

  // ══ EVALUATION OVERLAY ══
  if (showEvaluation) {
    return (
      <div className={container}>
        <button
          type="button"
          onClick={() => setShowEvaluation(false)}
          className="inline-flex items-center gap-2 h-10 px-3 -ml-3 rounded-lg text-sm font-semibold text-ink-soft hover:bg-paper-2 hover:text-ink transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Tornar al xat
        </button>
        <h1 className="mt-4 text-2xl md:text-3xl font-extrabold text-ink mb-2">Avaluació</h1>
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-6">
          La IA ha avaluat la teva conversa
        </p>

        <div className="bg-paper-2 border-2 border-line rounded-2xl p-6 mb-6">
          <p className="text-base md:text-lg text-ink leading-relaxed whitespace-pre-line">
            {evaluation}
          </p>
        </div>

        <div className="space-y-3">
          {hasTTS && (
            <button
              type="button"
              onClick={() => speak(evaluation)}
              aria-label="Escolta l'avaluació"
              className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong"
            >
              <Volume2 size={18} strokeWidth={2} aria-hidden="true" />
              Escolta l&apos;avaluació
            </button>
          )}
          <button
            type="button"
            onClick={goBack}
            className="w-full h-14 rounded-2xl bg-primary text-white text-base font-extrabold uppercase tracking-wider btn-3d border-primary-dark"
          >
            Nova conversa
          </button>
          <button
            type="button"
            onClick={() => setShowEvaluation(false)}
            className="w-full h-14 rounded-2xl bg-paper text-ink text-base font-extrabold uppercase tracking-wider btn-3d border-line-strong"
          >
            Continuar la conversa
          </button>
        </div>
      </div>
    )
  }

  // ══ CHAT VIEW ══
  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-lg border-b border-line">
        <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Tornar a la llista de converses"
            className="inline-flex items-center gap-1.5 h-10 px-3 -ml-3 rounded-lg text-sm font-semibold text-ink-soft hover:bg-paper-2 hover:text-ink transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Tornar</span>
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-base md:text-lg font-extrabold text-ink truncate">{selected.title}</p>
          </div>
          <button
            type="button"
            onClick={evaluateConversation}
            disabled={isEvaluating || messages.length < 3}
            aria-label="Avaluar la conversa"
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-semibold text-accent hover:bg-accent-soft transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} strokeWidth={2.25} aria-hidden="true" />
            {isEvaluating ? '...' : 'Avaluar'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          role="log"
          aria-label="Conversa"
          className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-6 space-y-4"
        >
          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] px-5 py-3.5 rounded-2xl',
                    msg.error
                      ? 'bg-error-soft text-error rounded-bl-sm'
                      : msg.role === 'user'
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-paper-2 text-ink border border-line rounded-bl-sm',
                  )}
                >
                  <p className="text-base md:text-lg leading-relaxed">{msg.content}</p>
                  {msg.role === 'assistant' && !msg.error && hasTTS && (
                    <button
                      type="button"
                      onClick={() => speak(msg.content)}
                      aria-label="Escolta aquest missatge"
                      className="mt-2 inline-flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors"
                    >
                      <Volume2 size={16} strokeWidth={2} aria-hidden="true" />
                      <span className="text-sm font-semibold">Escolta</span>
                    </button>
                  )}
                  {msg.error && (
                    <button
                      type="button"
                      onClick={() => {
                        setMessages((prev) => prev.filter((m) => !m.error))
                        const last = [...messages].reverse().find((m) => m.role === 'user')
                        if (last) sendDirect(last.content)
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-error hover:underline"
                    >
                      <RefreshCw size={14} strokeWidth={2} aria-hidden="true" /> Reintentar
                    </button>
                  )}
                </div>
              </div>
              {msg.correction && (
                <div className="flex justify-start mt-2">
                  <div className="max-w-[85%] bg-warning-soft rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <Lightbulb size={18} strokeWidth={2.25} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-base text-warning leading-relaxed">{msg.correction}</p>
                    </div>
                    {hasTTS && (
                      <button
                        type="button"
                        onClick={() => speakCorrection(msg.correction!)}
                        aria-label="Escolta la pronunciació correcta"
                        className="inline-flex items-center gap-2 bg-warning/20 hover:bg-warning/30 rounded-full px-4 h-9 text-sm font-semibold text-warning transition-colors"
                      >
                        <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
                        Escolta la pronunciació correcta
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start" role="status" aria-label="La IA està escrivint">
              <div className="bg-paper-2 border-2 border-line rounded-2xl rounded-bl-sm px-5 py-4">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 bg-ink-subtle rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2.5 h-2.5 bg-ink-subtle rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2.5 h-2.5 bg-ink-subtle rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="sticky bottom-0 z-20 bg-paper/95 backdrop-blur-lg border-t border-line">
        <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-3 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <span className="text-sm font-semibold text-ink-muted shrink-0 self-center">
              Exemples:
            </span>
            {currentSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => (audioMode ? sendDirect(s) : setInput(s))}
                className="bg-paper-2 border border-line rounded-full px-4 h-10 text-sm text-ink hover:bg-paper-3 transition-colors whitespace-nowrap shrink-0 font-semibold"
              >
                {s}
              </button>
            ))}
          </div>

          {audioMode ? (
            <div className="flex flex-col items-center gap-2">
              {isSpeaking && (
                <p className="text-sm font-semibold text-ink-soft flex items-center gap-2" role="status">
                  <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse" /> La IA està parlant...
                </p>
              )}
              <button
                type="button"
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onMouseLeave={stopListening}
                onTouchStart={(e) => { e.preventDefault(); startListening() }}
                onTouchEnd={stopListening}
                disabled={isTyping || isSpeaking}
                aria-label={isRecording ? 'Parlant... deixa anar per enviar' : 'Mantén premut per parlar'}
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center transition-all select-none disabled:opacity-30',
                  isRecording
                    ? 'bg-error scale-110'
                    : 'bg-accent hover:bg-accent-hover active:scale-105',
                )}
              >
                <Mic size={32} strokeWidth={2.25} className="text-ink-inverse" aria-hidden="true" />
              </button>
              <p className="text-sm font-semibold text-ink-soft">
                {isRecording ? 'Parlant...' : isTyping ? 'Pensant...' : isSpeaking ? '' : 'Mantén premut per parlar'}
              </p>
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="O escriu aquí..."
                  aria-label="Escriu un missatge en català"
                  className="flex-1 bg-paper-2 border border-line rounded-full px-4 h-11 text-base text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-ring"
                />
                {input.trim() && (
                  <button
                    type="button"
                    onClick={sendMessage}
                    aria-label="Enviar missatge"
                    className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary-light transition-colors"
                  >
                    <Send size={16} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {hasSR && (
                <button
                  type="button"
                  onMouseDown={startListening}
                  onMouseUp={stopListening}
                  onMouseLeave={stopListening}
                  onTouchStart={(e) => { e.preventDefault(); startListening() }}
                  onTouchEnd={stopListening}
                  aria-label={isRecording ? 'Gravant... deixa anar' : 'Mantén premut per gravar veu'}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors select-none',
                    isRecording
                      ? 'bg-error text-ink-inverse animate-pulse'
                      : 'bg-error-soft text-error hover:bg-error hover:text-ink-inverse',
                  )}
                >
                  <Mic size={18} strokeWidth={2} aria-hidden="true" />
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Escriu en català..."
                aria-label="Escriu un missatge en català"
                className="flex-1 bg-paper-2 border border-line rounded-full px-5 h-12 text-base text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-ring"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                aria-label="Enviar missatge"
                className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shrink-0 hover:bg-primary-light disabled:opacity-30 transition-all"
              >
                {isTyping ? (
                  <Sparkles size={18} strokeWidth={2} className="animate-pulse" aria-hidden="true" />
                ) : (
                  <Send size={18} strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
