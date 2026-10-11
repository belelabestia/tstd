" tz: the typescript syntax, plus the words typescript does not have
"
" the mirror of editor/: source.tz is one include of source.ts, and tz.words is
" an injection merged into every rule at every depth. nvim has no textmate
" engine, and its tree-sitter typescript parser cannot read tz at all: a side
" quest is not valid typescript, so a .tz file parses into ERROR nodes and the
" editor goes grey exactly where the language does its work. so the base is the
" runtime's own regex typescript, the same kind of engine a grammar is, and the
" injection takes the two forms one has: the words join the clusters the base's
" regions name, and the few regions that spell out their contains= by hand are
" followed with containedin. precedence here is the earliest effective match
" and then the latest definition, so every rule sits after the include, and
" every item that is only reachable from another one stays out of the clusters.

if exists('b:current_syntax') && b:current_syntax =~# '^\(tz\|typescript\)$'
  finish
endif

runtime! syntax/typescript.vim
unlet! b:current_syntax

syntax case match

" the regions that name their contains= item by item instead of by cluster, so
" the injection cannot reach them by joining one; these are followed by hand
syntax cluster tzHosts contains=typescriptBlock,typescriptObjectLiteral,typescriptFuncCallArg,
  \ typescriptParenExp,typescriptIndexExpr,typescriptArrowFuncDef,typescriptTernary,typescriptImportBlock

" the guard every pattern in tz-words.tmLanguage.json carries as a leading
" lookbehind: a word after a dot is a property. result.ok is not the ok exit
let s:no = '\%([.$]\)\@<!'

" the exit family, and else
execute 'syntax match tzExit /' . s:no . '\(return\|ok\|err\|async\|break\|continue\)\>/ containedin=@tzHosts'
execute 'syntax match tzElse /' . s:no . 'else\>/ containedin=@tzHosts'

" the constructs that bond to a tstd module. a form or a protocol names its
" shape, and nextgroup is the only way a syntax engine reaches that name
execute 'syntax match tzBoundary /' . s:no . '\(try\|call\)\>/ containedin=@tzHosts'
execute 'syntax match tzScope /' . s:no . 'scope\>/ containedin=@tzHosts'
execute 'syntax match tzDecl /' . s:no . '\(form\|protocol\)\>/ containedin=@tzHosts nextgroup=tzName skipwhite'
syntax match tzName /\k\+/ contained

" the side quests: the `?` and what is glued to it, one claim per spelling.
" `?:` splits because the tag it names wants its own colour
syntax match tzQuest /?\%(==\|!=\|none\|some\|ok\|err\|:\|(\|!\)/ containedin=@tzHosts
syntax match tzQuest /?\ze\s*{/ containedin=@tzHosts
syntax match tzQuest /?\ze\%(\s\|$\|;\|,\|)\|]\|=>\|return\|ok\|err\|async\|break\|continue\)/ containedin=@tzHosts
syntax match tzQuest /?\%(<=\|>=\|[<>&|]\)/ containedin=@tzHosts
syntax match tzTag /\%(?:\)\@<=\k\+/ containedin=@tzHosts

" the `:tag` construction and the `:tag` arm of a `? {}` block. a bare colon
" is the tell: it stands where no property, label or annotation can, because
" each of those grows from a word. `?:` is the optional marker and stays out
syntax match tzColon /\%(\k\|[.?]\)\@<!:/ containedin=@tzHosts nextgroup=tzBranch skipwhite
syntax match tzBranch /\k\+/ contained

" the arms of a `? {}` block: only an arm begins its line with these
syntax match tzArm /^[\t ]*\zs\%(==\|!=\|<=\|>=\|&&\|||\|[<>&|]\)/ containedin=@tzHosts
syntax match tzArm /^[\t ]*\zs(/ containedin=@tzHosts

" a machine reads as arrows between names: a branch heads its line and
" carries its payload in angle brackets, which nothing else in tz does
syntax match tzMachine /^[\t ]*\zs\k\+\ze\s*</ containedin=@tzHosts

" the injection. these clusters are what the base's regions name in their
" contains=, so joining them makes a word visible in a body, an argument list,
" a parenthesised expression, an object value and after an expression.
" tzName, tzBranch and tzHole stay out: they answer a nextgroup, and as
" cluster members they would claim every identifier and every brace in sight
syntax cluster tzWords contains=tzExit,tzElse,tzBoundary,tzScope,tzDecl,tzQuest,tzTag,tzColon,tzArm,tzMachine,tzTemplate
syntax cluster typescriptStatement add=@tzWords
syntax cluster typescriptValue add=@tzWords
syntax cluster typescriptExpression add=@tzWords
syntax cluster typescriptTopExpression add=@tzWords
syntax cluster typescriptSymbols add=@tzWords
syntax cluster typescriptDestructures add=@tzWords

" two base regions come back out. the ternary because tz bans `?:` and its
" region owns every `?` it can see; the template because the base ends one at
" the first inner backtick, so a nested template in a `${}` hole strands every
" line below it in a string. with those clusters emptied, tz has exactly one
" template engine, the one below
syntax cluster typescriptSymbols remove=typescriptTernary
syntax cluster typescriptPrimitive remove=typescriptTemplate
syntax cluster typescriptEventTypes remove=typescriptTemplate
syntax cluster afterIdentifier remove=typescriptTemplate

" template literals, re-declared. the base ends a template at the first inner
" backtick, so the nested one inside a `${}` hole strands every line below it
" in a string. this one nests the only way an engine of start and end patterns
" can: the template holds the hole, the hole holds the tz words and itself,
" and neither holds a template. a backtick is then always text inside a hole,
" and the closing backtick is the only thing that can end the region. base
" primitives stay out of the hole too: their nextgroup chains reach back into
" the clusters, and a template opened from inside a hole eats the outer closer
syntax region tzTemplate start=/`/ skip=/\\\\\|\\`/ end=/`/ contains=tzHole
syntax region tzHole matchgroup=typescriptTemplateSB start=/\${/ end=/}/ contained
  \ contains=@tzHoleWords,tzHole
syntax cluster tzHoleWords contains=tzExit,tzElse,tzBoundary,tzScope,tzDecl,tzQuest,tzTag,tzColon,tzArm,tzMachine

highlight default link tzExit Keyword
highlight default link tzElse Keyword
highlight default link tzBoundary Exception
highlight default link tzScope StorageClass
highlight default link tzDecl StorageClass
highlight default link tzName Function
highlight default link tzMachine Function
highlight default link tzQuest Special
highlight default link tzColon Operator
highlight default link tzTag Type
highlight default link tzBranch Type
highlight default link tzArm Operator
highlight default link tzTemplate typescriptTemplate

unlet! s:no
let b:current_syntax = 'tz'
