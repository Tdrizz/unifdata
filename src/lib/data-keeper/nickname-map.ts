// Bidirectional nickname → canonical name dictionary.
// canonicalize() returns the canonical (full) form of any known nickname.
// Both directions are stored so "Bob" → "Robert" and "Robert" → "Robert".

const ENTRIES: [string[], string][] = [
  [["bob", "bobby", "rob", "robby"], "robert"],
  [["bill", "billy", "will", "willy", "liam"], "william"],
  [["jim", "jimmy", "jamie"], "james"],
  [["mike", "mickey", "mick", "mikey"], "michael"],
  [["chris", "kris"], "christopher"],
  [["tom", "tommy"], "thomas"],
  [["dick", "rick", "ricky", "richie", "rich"], "richard"],
  [["dave", "davy"], "david"],
  [["steve", "stevie"], "steven"],
  [["joe", "joey"], "joseph"],
  [["jack", "jackie"], "john"],
  [["dan", "danny"], "daniel"],
  [["ben", "benny", "benji"], "benjamin"],
  [["pat", "patty"], "patrick"],
  [["sam", "sammy"], "samuel"],
  [["liz", "beth", "betsy", "betty", "ellie", "lisa", "libby"], "elizabeth"],
  [["kate", "katie", "kathy", "katy", "cathy", "kit", "cate"], "katherine"],
  [["sue", "suzy", "susie"], "susan"],
  [["jenny", "jen", "jenn"], "jennifer"],
  [["peg", "peggy", "maggie", "meg"], "margaret"],
  [["cindy", "cindi", "sindy"], "cynthia"],
  [["sandy", "sandi"], "sandra"],
  [["barb", "babs"], "barbara"],
  [["debbie", "deb", "debby"], "deborah"],
  [["nate", "nat"], "nathaniel"],
  [["alex", "alec", "xander"], "alexander"],
  [["matt", "matty"], "matthew"],
  [["andy", "drew"], "andrew"],
  [["tony", "toni"], "anthony"],
  [["vince", "vinnie"], "vincent"],
  [["nick", "nicky"], "nicholas"],
  [["bec", "becky", "becca"], "rebecca"],
  [["tina"], "christina"],
  [["gabe"], "gabriel"],
  [["zach", "zack", "zak"], "zachary"],
  [["fred", "freddy", "freddie"], "frederick"],
  [["ed", "eddie", "ned", "ted", "teddy"], "edward"],
  [["frank", "frankie"], "francis"],
  [["greg", "gregg"], "gregory"],
  [["ken", "kenny"], "kenneth"],
  [["larry", "lars"], "lawrence"],
  [["leo"], "leonard"],
  [["lou", "louie"], "louis"],
  [["mark"], "marcus"],
  [["ray", "rayy"], "raymond"],
  [["ron", "ronnie", "ronny"], "ronald"],
  [["don", "donnie"], "donald"],
  [["chuck", "charlie"], "charles"],
  [["gene"], "eugene"],
  [["hal"], "harold"],
  [["hank", "harry"], "henry"],
];

const lookup = new Map<string, string>();

for (const [nicknames, canonical] of ENTRIES) {
  lookup.set(canonical, canonical);
  for (const nick of nicknames) {
    lookup.set(nick, canonical);
  }
}

export function canonicalize(name: string): string {
  return lookup.get(name.toLowerCase().trim()) ?? name.toLowerCase().trim();
}

export function nicknameMatch(a: string, b: string): boolean {
  return canonicalize(a) === canonicalize(b);
}
