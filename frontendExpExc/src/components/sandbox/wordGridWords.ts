/**
 * A curated list of common English words (3-8 letters) for the Word Grid
 * game's word validation. Not an exhaustive dictionary - a fixed common-word
 * list, deliberately biased toward everyday vocabulary so most finds on a
 * freshly-dealt board are actually recognized. Space-separated for size;
 * split once into a Set at module load.
 */
const WORD_LIST_RAW = `
the and for are but not you all can had her was one our out day get has him his how man new now old see two way who boy did its let put say she too use dad mom
act add age ago aim air ale amp ant any ape apt arc ark arm art ash ask ate awe axe
bad bag ban bar bat bay bed bee beg bet bib bid big bin bit boa bog bop bow box boy
bad bag bat bay bee big bit boy bud bug bun bus but buy bye cab cam can cap car cat
cob cod cog con cop cot cow cry cub cue cup cut den dew did die dig dim dip dry dub
duck dug dug dye ear eat ebb eel egg elf elk elm ere ewe eye fan far fat fed fee few
fig fin fit fix flu fly fog for fox fry fun fur gap gas gel gem get gig gnu gob got
gum gun gut guy gym had ham has hat hay hen her hid him hip his hit hog hop hot how
hub hue hug hum hut ice icy ill imp ink inn ion ire irk its ivy jab jam jar jaw jay
jet jig job jog jot joy jug jut keg key kid kin kit lab lad lag lap law lay led leg
let lid lie lip lit log lot low mad man map mat may men met mid mix mob mom mop mud
mug mum nab nap net new nod nor not now nut oak oar odd off oil old one opt orb ore
our out owe owl own pad pal pan pat paw pay pea peg pen pet pig pin pit pop pot pow
pry pub pun pup pus put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod
roe rot row rub rug rum run rut rye sad sag sap sat saw say sea set sew she shy sip
sir sit six sky sly sob sod son sow spa spy sub sue sum sun tab tag tan tap tar tax
tea ten the tie tin tip toe ton too top tot tow toy try tub tug tux ugh urn use van
vat vet via vow wag wax way web wed wet who why wig win wit woe wok won wow yak yam
yap yen yes yet you zap zip zoo
able acid ache acre aide aids alit aloe amok apex aqua area arid army atom aunt axle
babe baby back bail bait bake bald ball balm band bang bank bare bark barn base bash
bass bath bead beak beam bean bear beat beef been beer bell belt bend bent best bike
bile bill bind bird bite blob blot blue blur boar boat body boil bold bolt bomb bond
bone book boom boot bore born boss both bowl brag bran brat brew brim brow buck bulb
bulk bull bump bunk burn bury bush bust busy cafe cage cake calf call calm came camp
cane cape card care cart case cash cast cave cell chef chew chin chip chop city clad
clam clan clap claw clay clip clog club clue coal coat code coil coin cold colt comb
come cone cook cool cope copy cord core cork corn cost cosy coup cove crab crib crop
crow cube cult curb cure curl curt cute daft dam damp dare dark darn dash data date
dawn dead deaf deal dean dear debt deck deed deem deep deer defy dell demo dent deny
desk dial dice diet dime dine dirt dish disk dive dock does doll dome done doom door
dorm dose dove down doze drag draw drew drip drop drug drum dual duck duct duel duet
dull duly duty dyed each earl earn ease east easy edge edit else envy epic even ever
evil exam exit face fact fade fail fair fake fall fame fang farm fast fate faun fawn
fear feat feed feel feet fell felt fence ferry fend fern feud fiat fill film find fine
fire firm fish fist five flag flap flat flaw flea fled flee flew flex flip flit flop
flow foam foil fold folk font food fool foot ford fore fork form fort foul four fowl
free frog from fuel full fume fund fungi funk fury fuse fuss fuzz gain gala gale gall
game gang gate gave gaze gear gene germ ghost gift gild girl give glad glow glue glut
goal goat gold golf gone gong good gore gory gown grab grad gram gray grew grid grim
grin grip grow grub gulf gulp gush gust hail hair half hall halo halt hand hang hard
harm hash hate haul have hawk haze head heal heap hear heat heed heel help herb herd
here hero hide high hike hill hind hint hire hive hoax hold hole holy home hone hood
hoof hook hope horn hose host hour huge hull hunt hurl hush hymn icon idea idle idol
inch iron isle item jade jail java jeep jell jelly join joke jolt joke judge juice
jump junk jury kale keel keen keep kelp kept kick kill kind king kiss kite knee knew
knit know lace lack lady lair lake lamb lame lamp land lane lard lark last late lava
lawn lazy lead leaf leak lean leap left lend lens lent less liar lick lied life lift
like lily limb lime limp line link lint lion list live load loaf loan lobe lock loft
lone long look loom loop loot lord lore lose loss lost loud love luck lull lump lung
lure lurk lush lust lute lynx made maid mail main make male mall malt mane many mare
mark mash mask mass mast mate math maze meal mean meat meet meld melt mend menu mesh
mess mild mile milk mill mind mine mint mist mode mold mole monk mood moon moor moot
more moss most moth move much mule mush must mute myth nail name nave navy near neat
neck need nerd nest news next nice nick node none noon norm nose note noun nude numb
oath obey odor oily okay omit once onto onus onyx opal open oral over pack page paid
pain pair pale palm pane pang pant park part pass past path peak pear peat peck peer
pelt pest pick pile pill pine pink pipe pity pixy plan play plea plot plow plug plum
plus poem poet poke pole poll pomp pond pony pool poor pope pork port pose posh post
pour pout pray prey prod prop prow pull pulp pulse pump punk pure push putt quad quake
quay quest quick quilt quit quiz race rack raft rage raid rail rain rake rally rank
rant rare rash rate rave read real reap rear rely rent rest ribs rich ride rife rift
rind ring riot ripe rise risk rite road roam roar robe rock role roll roof room root
rope rose rosy rote rout rove rude ruin rule rung runt rush rust ruth sack safe saga
sage said sail sale salt same sand sane sang sank sash save scab scale scan scar scoop
scope scorn scout scowl scrap screw scrub sect seed seek seem seen sell send sent sept
serf sews shade shady shaft shake sham shame shape share shark sharp shed sheep sheet
shelf shell shift shin shine ship shirt shock shoe shoot shop shore short shot show shrug
shun shut shy side sift sign silk silo silt sing sink site size skate skew skid skill
skin skip skirt skull slab slam slap slat slay sled sleep sleet slid slim sling slip
slit slog slope slot slow slug slum slur slush smack small smart smash smell smile
smog smoke snack snag snail snake snap snare snarl sneak sneer snip snob snoop snore
snort snout snow snug soak soap sock soda sofa soft soil sold sole solo song sons sonic
soon soot sore sort soul soup sour spam span spar spat spawn speak spear speck speed
spell spend spent spice spike spill spin spine spite splat split spoil spoke spoof
spool spoon sport spot spout spun spur spurt squad squat squid stab stack staff stag
stage stain stair stake stale stall stamp stand stare stark start stash state stay
steak steal steam steel steep steer stem step stern stew stick stiff still sting stink
stir stock stole stone stood stool stop store storm story stout stove stow strap straw
stray strew strip strut stub stud study stuff stump stunt style such suck suds suede
suit sulk sung sunk sure surf swab swag swam swan swap swat sway swig swim swine swing
swipe swirl swish swiss swoop sword swore syrup tack tail take tale talk tall tame tank
tape task taste teak team tear teem teen tell tend tent term test text than that thaw
them then they thin this thou thud thug thus tick tide tidy tier tile till tilt time
tint tiny tire toad toast toil told toll tomb tone tong took tool tooth toot tore torn
toss tote tour town toxic trace track trade trail train trait tramp trap tray tread
treat tree trek trend trial tribe trick trim trip trod trot trout true tuba tube tuck
tuft tulip tummy tune turf turn tusk twig twin twist type ugly unit upon urge used
user vain vale vane vary vase vast veal veer veil vein vent verb very vest veto vial
vice view vile vine visa void volt vote wade wage wail wait wake walk wall wand want
ward warm warn wart wash wasp wave weak wear weed week weep weld well went were west
what when whim whip whir whit wide wife wild will wilt wind wine wing wink wipe wire
wise wish wolf womb wood wool word wore work worm worn wove wrap wren yard yarn year
yell yolk yoga your zeal zest zinc zone
ability absorb absurd accent accept access accord accuse acidic across action actual
addict admire admit adopt adult advice affair afford afraid agenda agree ahead album
alien alike alive allow allowed almost along alter amaze amber amount amuse anchor
angel anger angle angry animal ankle annoy answer anthem anxiety apart appeal appear
apple apply arcade arena argue arise armor around arrest arrive arrow artist ashamed
aside asleep aspect assert assign assist assume athlete attach attack attempt attend
attic attract auburn august author autumn avenue avoid awake award aware awful awhile
backup badge bakery balance banana banjo banner barber barely bargain barrel basic
basin basket battle beacon beauty become bedbug before began begin behalf behave
behind belief believe belong bench beside better beyond bicycle bigger billion bishop
bitter blade blame blank blanket blast blaze bleach bleed blend bless blind blink
bliss block blond blood bloom blouse blunt board boast bonus border bottle bottom
bounce bound bowl boxer brace brain branch brand brass brave bread break breath brick
bride bridge brief bright bring broad broke bronze brook brother brown brush bubble
bucket budget buffet bullet bundle burden burger burial button buyer cabin cabinet
cactus camera campus cancel cancer candle candy cannon canoe canvas canyon capable
capital captain carbon career careful cargo carpet carrot carry castle casual catch
cattle caught cause cedar ceiling celery cellar census center cereal chain chair
chalk champ change channel chaos chapel chapter charge charity charm chart chase
cheap check cheek cheer cheese chef chest chicken chief child chill chin china choice
choose chorus chosen circle circus citizen city civil claim clash class clean clear
clerk clever climb clinic clock closet closer cloth cloud clown club coach coast
cocoa coffee collar column combat comedy comet comfort comic common compact company
compare compete complex concert cone confuse connect consent contact contain content
contest context contour control convey cookie cooper copper corner corral cotton
couch cough could count county couple courage course court cousin cover coward
cradle craft crash crawl crazy cream create credit creek crew crime crisis critic
crook cross crowd crown crude cruel crumb crush crystal cuddle culture cupid curly
curve custom cyber cymbal dagger dairy damage dance danger dawn dazzle deacon dealer
death debate debris decade decay decide decline decode decor defeat defend define
degree delay delete delight demand denial dense dental deny depend depict deploy
depth derive desert design desire desk detail detect device devil diesel differ
digit dilemma dinner direct dirty disable disagree disco discuss disease dismiss
disorder display disrupt distant divide doctor dollar domain donate donor donkey
double doubt drain drama draft dragon drawer dread dream dress drift drill drink
drive driver drone drought drown drum dryer dumb dusty duty eager eagle early earth
easily eastern eating economy edge edible educate effect effort either elbow elder
elect elegant element elevate elite email embark embrace emerge emotion employ enable
enact endure enemy energy engage engine enjoy enlist enough ensure enter entire
entrust envy episode equal equip erase erode error escape essay essence estate
ethics event evolve exact exceed excess excite exclude excuse exist expand expect
expel expert explain export expose extend extra extreme fabric facade facial factor
factory faculty faint faith falcon family famous fancy fashion faster father fatigue
fatty fault favor feast feather feature feeble female fence ferry fever fiber field
fierce fifteen fifty figure filter final finance finger finish fiscal fitness fixed
flame flavor fleece flesh flight float flock flood floor florist flour fluent fluid
flute focus folder follow foolish forbid force forecast forest forget forgive formal
format formula fossil foster fought fountain fragile frame franchise freckle freedom
freeze french frenzy fresh friend fringe frost frown frozen fruit fudge fumble funny
future gadget galaxy gallery gallon gamble garage garbage garden garlic garment gasoline
gather gauge gender general genius gentle genuine gesture giant giggle ginger giraffe
girlfriend glance glare glass glaze glide glimpse global globe glory glove goblet
golden gorgeous gospel gossip govern grace grade grain grand grant grape graph grasp
grass gravel gravity greasy great greedy green greet grief grill groove group grove
growth guard guess guest guide guilt guitar gutter habit hamlet hammer hamster
handle happen happy harbor harden harmony harness harvest hazard header healer health
heavy hedge height hello helmet helper hemisphere heritage hidden hobby holder hollow
homework honest honey honor hoodie horizon horror horse hospital hostage hotel hover
howl human humble humor hunger hungry hunter husband hybrid hydro hymn iceberg
identity idiom ignore image imagine immune impact import impose improve impulse
income indeed index infant infect inform initial injury inmate inner innocent input
insect inside insist inspire install intend intent invade invent invest invite
involve island isolate issue ivory jacket jaguar jasmine jealous jelly jersey jewel
journey judge juggle jungle junior justice keeper kernel kettle kidney kingdom
kitchen kitten knight labor ladder lagoon lamp language lantern laptop large laser
lather laugh launch laundry lawyer layer leader league leather lecture legacy legend
lemon length lesson letter level liberty library license lifter lightly likely limit
linen linger liquid listen litter little lively liver living lizard loader lobby
local locker lonely longer lookup loosen lottery lounge lovely loyal lucky lumber
lunar lunch luxury lyrics machine magnet magic maiden mainly major maker mammal
manage mango mantle manual maple marble margin marine market marriage marsh martyr
mascot mason master matrix matter mature maybe mayor meadow measure medal medium
melody member memory mental mentor mercy merge merit mermaid message metal method
middle midnight mighty mineral minor minute mirror mischief mission mister mixer
mobile modern modest module moment monarch monkey monster monthly moral morning
mortal mostly mother motion motor mount mouse mouth movie muffin muscle museum
mushroom music mutual mystery narrow nasty native nature nearby nebula needle
neighbor nephew nervous network neutral nickel niece nimble ninety nobody normal
notice novel nudge nugget number nurse nutrient object obtain occasion occupy ocean
octave offer office often olive omega onion online opera option orange orbit order
organ origin orphan ostrich other outcome output oven owner oxygen oyster ozone
package paddle palace pallet panda panel panic pantry parade parcel parent parlor
parole partner passage passion pastor pasture patch patent patio patriot patrol
pattern pause peace peanut pearl pebble pedal peer pencil pepper perfect perform
period permit person pester petal phone photo phrase physics picnic picture pillar
pillow pilot pioneer pirate pitcher pizza planet plank plaza pledge plenty plumb
plural pocket poison polar police policy polish polite pollen pollute pond popcorn
poplar poster potato pottery powder power praise prefer prepare present preview
priest prince print prison profit project promise promote proper protect proud
proven public pumpkin puppet puppy purple purpose pursue puzzle python quality
quarter queen quench query quiet quilt quiver rabbit radar radish raider railway
rainbow raisin random ranger rapid rather ravine reader reason rebate recall recess
recipe record recruit reduce refine reform refuse regard region relate relax
release relief remain remedy remind remote remove rename repair repeat replace
report rescue resign resist resort resource respect result retail retreat return
reveal review reward rhythm ribbon ripple rival river robber robot rocket rodent
romance rooster rotate rough round router royal rubber rugby ruling rumor runner
rural sacred saddle safari safety sailor salad salmon saloon salute sample sample
sandal savage saving scale scarf scary scatter scenic scholar school scissor scoop
scout script scroll sculpt search season second secret sector select seller senior
sense sentence series servant service settle severe shadow shallow shampoo shelter
sheriff shield shiny shiver shore shortly shoulder shovel shower shrimp shrine
shrink shutter siege signal silent silver simple singer single sister skater sketch
skillet slalom slave sleepy sleeve slice slight slogan smash smoky snowy soccer
social soften soldier solid sorrow sorry source sparkle sparrow special species
speech spider spinach spirit splash sponge spouse spread spring sprout square squeeze
squirrel stable stadium stamp standard staple starve statue status steady steam
stellar sticky stomach stone story stormy strain strand stream street stress
stretch strict stroke strong struct student studio study stuff sturdy submit subtle
subway suburb sudden suffer sugar summer summit sunny sunset supply surface surge
surgery surplus survey survive suspect sustain swallow swamp sweater sweep sweet
swift switch symbol symptom system table tablet talent talon tangle target tavern
teacher temper temple tender tennis tenant tension terrace terror thank theater
theme theory thick thief thigh thirst thorn though thread threat throat throne
throw thumb thunder ticket tidal tiger timber timely tissue toast toddler toffee
token tomato tonight torch toward towel tower toxic trace tractor traffic tragic
trailer transfer transit trauma travel treaty tremble trench trial tribute trigger
trolley trophy trouble truck trumpet trunk trust tumble tunnel turkey turtle tutor
tuxedo twelve twenty twice twist ultra umpire uncle undergo unfair unique unite
unity unlock unpack update upgrade upload upset urban usage useful usher utensil
utility vacant vacuum valid valley valve vanish vanity vapor vector vendor venture
verbal verify vessel veteran victim victor video villain violet violin virtue virus
visible vision visit visual vital vivid vocal volume voyage wagon waiter walnut
wander warden warmth warning warrior washer waste watch wealth weapon weary weather
website wedding weekend weekly weight welfare western whale wheat wheel whisper
whistle widow width willow window winner winter wisdom wither wizard wonder wooden
worker worship worthy wrestle writer yellow zipper
`;

export const WORD_SET: Set<string> = new Set(
    WORD_LIST_RAW.split(/\s+/).map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3),
);
