# IPv8 kennis samenvatting
De `discipl-core-ipv8` connector maakt nu gebruik van de ingebouwde _attestation service_ van IPv8. Dit gebeurd nu via de REST API die gebouwd is bovenop de Python implementatie [py-ipv8](https://github.com/Tribler/py-ipv8). Echter kent IPv8 enkele grote verschillen in hoe claims worden gemaakt en afgehandeld ten opzichte van Discipl. Om dit toe te lichten zal eerst de huidige implementatie worden uitgelegd, daarna zullen de verschillen worden toegelicht.

## Huidige implementatie attestation flow
Gegeven _Peer A_, _Peer B_ en de claim _i_have_no_debt_.

**Notitie:** Binnen IPv8 wordt gesproken over attributen i.p.v. van claims. Deze twee termen kunnen in het onderstaande voorbeeld als gelijk worden beschouwd.

1. _Peer A_ gebruikt de connector methode `claim` om de claim _i_have_no_debt_ uit te drukken. Op de achtergrond wordt hiervoor een attestation request naar _Peer B_ gestuurd. Uit dit verzoek volgt de tijdelijke link `link:discipl:ipv8:temp:eyJuZWVkIjoiYmVlciJ9`, de reference van deze link is de Base64 encoded versie van de attribute naam (in ons geval de claim _i_have_no_debt_.
2. `Peer B` ontvangt dit verzoek en attest het attribute met een value. Hieruit volgt de permanente link `link:discipl:ipv8:perm:trustchain_block_hash`
3. Vanaf het moment dat `Peer B` de claim attest is deze terug te vinden in zowel de Trustchain als de attestation service

## Verschillen
Er zijn twee grote verschillen in het afhandelen van attestation tussen IPv8 en Discipl. Het belangrijkste verschil is dat binnen IPv8 geen duidelijke scheiding is tussen een claim en een attestation. Binnen bijv. de Ephemeral connector wordt eerst een claim uitgedrukt welke vervolgens geattesteerd kan worden. Bij IPv8 wordt een claim uitgedrukt d.m.v. een attestation request. Daarnaast kan een peer kan geen attestation request naar zichzelf sturen, het is dus niet mogelijk om als individu iets te claimen zonder attestation. De daadwerkelijke claim is pas vindbaar als deze attested is door een andere peer.

Een ander verschil is dat claims (attested attributes) publiek inzichtelijk zijn in de trustchain. De value van de attestation is niet publiek, maar de claim zelf wel. Het claimen van prive data is dus niet goed mogelijk. Meer informatie hierover is te vinden in een hiervoor aangemaakt [GitHub issue](https://github.com/Tribler/py-ipv8/issues/728) op de IPv8 repository.

De bovenstaande verschillen zorgen ervoor dat in de 1e stap van de huidige implementatie de volledige claim wordt opgenomen in de link. Deze walk-around maakt het mogelijk om als individu toch een claim uit te drukken. De link naar deze claim is echter niet stabiel en de claim is publiek inzichtelijk.

## Mogelijk oplossingen
De meest voor de hand liggende oplossing is het introduceren van een 2e channel voor het maken van claims. IPv8 krijgt dan enkel de attestation van claims als verantwoordelijkheid. Als dit tweede kanaal vertrouwelijk en versleuteld is lost dit beide problemen op.

Een andere mogelijk oplossing is het definieren van een custom overlay/community voor IPv8. Binnen deze custom overlay kan veilige peer2peer communicatie plaatsvinden voor private data en kan self-attestation worden gerealiseerd.
