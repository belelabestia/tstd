# 12 choose the target working context

## intent

the next big thing is not a construct, it is a program. this session chooses the first honest program tz must carry, so the battle phase has something real to stress. the author rules on the target, and this file records the ruling, the rejected alternatives, and a one-page brief with the constructs under test and the definition of a first version.

## inputs

- `../sessions/12-choose-the-target.md` (the charge, the candidates, the acceptance).
- `../context/11-define-robust.md` (the robust standard, the definition of the first build, q5).
- `../roadmap.md` (the goal, the phases, the ledger).
- `../../DESIGN.md` (the constructs, the ban list, the constraints).
- `../../TUTORIAL.md` (how to write tz).
- `../../../AGENTS.md`, `../../../STYLE-KB.md` (voice and rules).
- the author's intent from the session conversation: a personal public website that is the medium, not a link hub, with photos, blog, music and links; the first tenant of a personal app ecosystem; written in tz.

## the brief

### the program

the personal site: a monolith web service written in tz, files first. it serves the profile home, the cv, the links, and the new blogs by topic, each topic a page and each post a page, with the theme following the topic, and links out to the old wordpress archive. one service, one deploy.

### who it is for

the author, as the first user, and any visitor. it is the medium: the writing is read here, the cv is read here, and the links are the only outbound thing.

### the constructs under test

- `form`: the shapes of a post, a topic, the cv and a link.
- `result`: reads of the content files, and the not-found path.
- `scope`: the content source, a directory read now, a connection when the db arrives.
- `protocol`: the page machine (a singleton page against a collection page) and the topic to theme mapping.
- `call`, `make`: the boundaries (http, the file system, the server instance).
- the side quests: a missing post (`?none` into a not-found), a topic with no posts.
- the exits: `ok` and `err` for a response.
- the arrow captures: the rendering helpers.

### the definition of a first version

- the routes: home, cv, links, the topic list, a topic page, a post page.
- the content: files on disk, markdown for prose and a structured file for the cv and the links, one topic seeded.
- the theme follows the topic.
- it runs as a node server and deploys behind caddy.
- an end-to-end spec boots the server, requests each route and asserts the response, under `npm test`.

### the session 11 criteria, mapped

- a whole problem: it takes http requests (a socket) and produces pages a person can use. met.
- it runs in the build: the end-to-end spec executes the server under `npm test`. owed to session 14.
- the leaky group at least once: `form` for the content shapes, `protocol` for the page and theme machine, `scope` for the content source, `call` for the boundary, `make` for the server. all five. met by use.
- the friction is written down: the ledger, during session 14. owed.
- criterion 7, a real program runs on tz: this build. criterion 8, a newcomer follows the tutorial: sharpened in phase 3.

## decisions

all dated 2026-10-05, ruled by the author in the session conversation.

- **the target is the personal site as a monolith, files first.** the author wants the site itself, small enough to finish and real enough to use; a monolith avoids distributed plumbing (shared auth, service calls) before a second app exists; files first gets it running and defers postgres to when photos and music need relations. rejected: the blog and topics service alone (a piece, not the site); the profile shell alone (mostly presentation, stresses little tz, and depends on content that does not exist); postgres first (pays for the db before anything needs it).

- **a page is one of two kinds.** a singleton page (home, cv, links) is one file rendered once; a collection page (a topic, a post) is generated per item from a directory. the theme belongs to the collection, so the page machine has a home. rejected: every page the same (the listing and the theme would have no home); a content-type registry (a construct the problem has not forced).

## evidence

no code changed; this session is a decision, so the evidence is the standing green suite.

- `npm test` (root): exit 0, 43 pass.
- `npm test` (tz): exit 0, 69 src plus 54 decks pass.
- `tzc examples constructs`: exit 0.
- `tzx` spec (part of `npm test`): 54 pass.
- `tzd examples constructs`: exit 0, no warnings.

## open

- the content source shape (markdown front matter against a structured file) is not settled; it belongs to session 14.
- whether the cv is authored in this repo or imported from `belelabestia-it` is not settled; a session 14 question.

## close

- commits (planned; the author reviews before any of them land):
  - `choose the target` (`tz/plan/context/12-choose-the-target.md`, `tz/plan/roadmap.md`, `tz/UPDATES.md`)
- `../../UPDATES.md` entry: `## 2026-10-06: choose the target`
- roadmap: session 12 flipped to done.
