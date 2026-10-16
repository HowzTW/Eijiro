---
name: find-naver-map-place
description: Find, introduce, and verify places on Naver Maps from either public Instagram or Facebook posts or short text clues such as a place name, Korean name, address, neighborhood, category, or brief description. Use when the user explicitly asks to look up a Naver Maps place, provide its Naver Maps link or URL, summarize a social post into a place result, or return a quick Traditional Chinese introduction together with a clickable link, a copyable URL, a bilingual place nickname of at most 25 visible characters, and a place highlight of at most 45 visible characters. For an SNS source, also summarize the recoverable post content. Do not trigger merely because the user pastes an unexplained social URL; ask whether they want a summary, a read-only place lookup, or a save action. Do not use for general place information without a Naver Maps request, or for requests to save, bookmark, add, or edit places in a Naver Maps account.
---

# Find Naver Map Place

Turn a public social post or short place description into a verified Naver Maps result, a concise Taiwan Traditional Chinese introduction, and copy-ready place nickname and note. Append a consolidated instruction for the user to paste into the desktop ChatGPT Chrome Extension to save the results to「AI暫存清單」. Keep the lookup workflow read-only.

## Workflow

1. Determine the input mode:
   - **SNS mode:** The user supplies a public Instagram or Facebook post, Reel, share URL, caption, or screenshot and explicitly requests a summary or Naver Maps lookup.
   - **Text mode:** The user supplies a place name, Korean name, address, neighborhood, category, or brief description and explicitly requests a Naver Maps lookup.
   - If the user only pastes an unexplained social URL, ask whether they want a post summary, a read-only Naver Maps lookup, or a save action. Do not infer a save request.
2. Search the web because social content, business status, branches, hours, and listings are current external information. Prefer official accounts and authoritative business sources, then corroborate with reliable independent sources.
3. Process the source:
   - In SNS mode, recover the public caption, account, location tag, visible image text, and video clues. If direct access is blocked, search the exact post ID or shortcode and distinctive caption fragments. State the limitation and never claim to have watched inaccessible media.
   - In text mode, extract every available clue and research the likely business before matching it to Naver Maps.
4. Identify the Korean place name, branch, street address, district, category, current operating status, and distinguishing details. Keep claims from an SNS post distinct from independently verified facts.
5. Match the Naver Maps listing by name, branch, street address, district, category, and current status. Never rely on the brand name alone. Establish the target identity independently before evaluating any candidate Place ID.
6. Apply the **Naver Place ID Verification Gate** below. Return a canonical `https://map.naver.com/p/entry/place/<place-id>` URL only after every required check passes. A plausible candidate, search-result ranking, or bare numeric URL is not a verified result.
7. Write a quick Taiwan Traditional Chinese introduction before the copy components:
   - In SNS mode, first summarize the recoverable post content, then add supplemental place information when useful.
   - In text mode, briefly explain the place's positioning, specialties, atmosphere or experience, and useful current details supported by sources.
   - Keep the introduction easy to scan and distinguish stable characteristics from changeable details such as hours or prices.
8. Write one useful Traditional Chinese highlight that distinguishes the place. Prefer stable features such as specialty, atmosphere, signature food, collections, or experience. Avoid prices, hours, hype, emojis, and unsupported claims.
9. Resolve `<skill-dir>` as the directory containing this file, then validate the note with `python3 <skill-dir>/scripts/validate_note.py "<note>"`. Revise until it passes.
10. Compose a place nickname following the Place Nickname Rules below for each matched place. Validate it with `python3 <skill-dir>/scripts/validate_note.py --max 25 "<nickname>"`, and revise it according to the prescribed shortening order until it passes.
11. Present the individual results in the exact output structure below, then append the Consolidated Save Instruction as the final content of the response, even for a single place.

## Matching Rules

- Treat the same brand at different addresses as different places.
- Prefer explicit address and branch evidence over proximity, popularity, or similar names.
- Check whether an older branch has closed, relocated, or been replaced before returning a result.
- If one source clearly contains multiple places, return one result group per place in the order presented.
- If multiple branches remain plausible, show the candidate names and addresses and ask the user to choose before producing final copy blocks.
- If an SNS post cannot be read well enough, request a screenshot, pasted caption, or uploaded video.
- Third-party pages may establish or corroborate a business's identity, address, category, and status, but they do not by themselves prove that an unrelated or bare Naver Place ID belongs to that business.
- If no exact Naver Maps listing can be verified, say that the business identity may be known but its Naver Place ID remains unverified. Optionally provide the exact Korean place name, full Korean address, and a Korean Naver search phrase outside code blocks. Never guess, fabricate, or output a candidate place ID or canonical URL.
- Do not log in, save, bookmark, modify a list, or otherwise act on the user's Naver account. An explicit request to save or add a Seoul place belongs to the separate `save-seoul-place-to-naver` workflow when applicable.

## Naver Place ID Verification Gate

Treat URL accuracy as a hard delivery gate. All of the following must pass for each result:

1. **Target identity:** independently establish the place's verified Korean name, relevant branch, and full street address. When no branch exists, establish that explicitly rather than inferring one.
2. **Direct ID binding:** obtain evidence that directly associates the candidate Naver Place ID or its resolving Naver URL with that same Korean name and full street address. The strongest evidence is an opened Naver detail page displaying both. An official business website or official social profile linking to that Naver listing may also establish the binding when its business identity and address are unambiguous.
3. **Destination confirmation:** open the candidate or resolved destination and confirm that it is a Naver place-detail destination for the target. Normalize a verified legacy, mobile, or shared Naver place URL to `https://map.naver.com/p/entry/place/<place-id>` only after the underlying ID binding has passed.
4. **Cross-check:** compare the bound listing against at least one independent authoritative or reliable source for name, address, branch, category, and current status. This cross-check can detect relocation or a same-name business, but cannot substitute for direct ID binding.

The following are automatic verification failures and must never be used to deliver a URL:

- A bare Naver URL or numeric Place ID whose result contains no readable target name and address.
- A page that is blank, unsafe to open, blocked by robots, redirects to generic help or search content, or reports that no page information is available.
- A Place ID inferred from query specificity, search-result order, adjacent snippets, URL similarity, or the fact that it appeared during a search for the target.
- A third-party page that confirms the business but does not directly link the candidate Naver ID to it.
- A result matching only the brand name, neighborhood, or one part of the address, especially when branches or similarly named businesses may exist.

If any gate item fails, classify the Naver result as **unverified**. Do not show the clickable-link component, copyable Naver URL block, or consolidated save instruction for that place. Explain the limitation plainly and provide search-ready identity details instead. Prefer withholding a URL over returning a plausible but unproven one.

## Place Nickname Rules

- Format the nickname as `中文譯名或英文店名［含分店資訊］｜韓文完整店名`; the brackets describe optional branch information and are not literal output.
- On the left, use a natural, recognizable Traditional Chinese place name or English brand name. Prefer official or established names; when no suitable Chinese name exists, prefer the English brand name over a forced literal translation. Preserve a user-specified name for the matched place.
- Include relevant branch or neighborhood information on the left in Traditional Chinese, naturally combined with the brand (for example, `Daily Routine 南營店` or `Anthracite 北村`). Do not force the suffix `店` onto every name or add an unrelated area prefix.
- On the right, preserve the verified full Korean place name, including branch information and its original spaces, unless the 25-character shortening procedure below requires removing non-identifying wording. Do not invent a branch.
- Separate the two names with exactly one fullwidth vertical bar `｜`, with no adjacent spaces. Preserve spaces within each name.
- Include only the place name and relevant branch information, without highlights, dishes, reviews, emojis, or explanatory labels. Keep the nickname on one line.
- Limit the nickname to 25 Unicode characters after NFC normalization and trimming outer whitespace. Count every letter, Chinese or Korean character, digit, internal space, and punctuation mark, including `｜`, as one character.
- If the nickname exceeds 25 characters, shorten it in this order and stop as soon as it passes:
  1. Remove a generic Traditional Chinese branch suffix such as `店` or `分店` when the Korean side already retains the same branch or neighborhood information. Preserve meaning-bearing branch labels such as flagship or main store unless another part of the nickname still conveys that distinction.
  2. Replace the left-side brand with a shorter official or widely established Chinese or English name. Never invent an abbreviation.
  3. Omit branch or neighborhood information duplicated on the left when the Korean side uniquely and clearly retains it.
  4. Only then, shorten the Korean side by removing non-identifying company forms, category words, or modifiers while retaining the Korean core name and any branch information needed to distinguish the listing.
- When the brand has multiple branches, retain the identifying branch or neighborhood on at least one side. Never remove it from both sides merely to meet the limit.
- Never cut a word or name midway, replace its ending with an ellipsis, or use `…`. Preserve the bilingual `左側名稱｜韓文名稱` structure throughout the shortening procedure.
- Present it under **地點暱稱** in its own `text` code block for direct copying into Naver Maps. Keep it separate from the URL and feature note.
- Use these examples to guide formatting, not as unverified listing data:
  - `Daily Routine 南營｜데일리루틴 남영`
  - `Fourstones 三清店｜포스톤즈 삼청점`
  - `鮮慧院｜선혜원`
  - `Anthracite 北村｜앤트러사이트 북촌`
  - `Leaflyene House｜리플린하우스`
  - `Batt Turr｜받터`

## Note Rules

- Use Taiwan Traditional Chinese.
- Limit the note to 45 Unicode characters after trimming outer whitespace; count spaces and punctuation.
- Keep it on one line and omit quotation marks, hashtags, emojis, and terminal punctuation when unnecessary.
- Aim for roughly 20–38 characters so the note remains readable and leaves a safety margin.
- Include only the feature text, not the place name, unless the name is necessary to disambiguate it.

## Output Structure

Start with ordinary Markdown, never a copy block.

For SNS mode, use a concise paragraph or 2–5 bullets under **貼文內容重點摘要**, then provide a compact place introduction under **地點介紹**.

For text mode, start directly with **地點介紹**. Include the verified Korean place name and address when useful. Put citations and qualifications in these ordinary Markdown sections, not inside the copy blocks.

Then provide the verified Naver Maps URL, place nickname, and place highlight in exactly these four components:

**直接開啟 Naver Maps**

[點這裡開啟 Naver Maps 地點](https://map.naver.com/p/entry/place/123456789)

**Naver Maps 網址**

```text
https://map.naver.com/p/entry/place/123456789
```

**地點暱稱**

```text
Daily Routine 南營｜데일리루틴 남영
```

**45字元內特色備註**

```text
藏身南營老市場的自家烘焙咖啡館，木構老屋裡品嚐手沖咖啡
```

The clickable link and copyable URL must use the identical verified URL. Keep citations, caveats, verification notes, and character counts outside all code blocks. For the individual place components, put only the copy target inside each block and keep the URL, nickname, and note separate. The final Consolidated Save Instruction intentionally combines all three fields for every result in one block.

For multiple places, provide one shared source summary when applicable, add each verified place name as a heading, and repeat the compact introduction plus the clickable-link-and-three-block structure for every place.

## Consolidated Save Instruction

- After all individual place information, always append **加入 AI暫存清單的完整指令** and one `text` code block containing the complete instruction below. Apply this to both one-place and multiple-place lookups. Do not replace the individual information with this block or ask whether the user wants it.
- Set the destination list to exactly `AI暫存清單`. Use the following opening sentence, substituting the actual number of verified results for `<N>`:

  `我已經登入好 Naver 帳號，請幫我把以下 <N> 個 Naver 地點，分別加入 Naver Maps 中的「AI暫存清單」，並填入對應的地點暱稱與特色備註：`

- After a blank line, repeat this three-line group for every verified result in the same order as the individual sections, with one blank line between groups:

```text
Naver Maps 網址：<verified URL>
地點暱稱：<nickname>
特色備註：<validated note>
```

- Assemble the opening sentence and all groups into a single code block, so one copy action captures the entire instruction. Replace all placeholders; do not use ellipses, omit entries, or split the instruction across blocks.
- Copy each URL, nickname, and note verbatim from its individual result. Preserve Korean spacing and the fullwidth separator `｜`; retain the validated note within 45 characters. Include only verified results from the current request, not unrelated places from earlier conversation.
- If some requested places remain unresolved, explain the missing results before the final block and include only verified results, with the count adjusted accordingly. If no place is verified, explain the limitation and omit the save instruction.
- Treat the opening sentence about being logged in as user-requested handoff text for later execution, not as a verified fact about the current browser. Generating this instruction does not authorize executing it, logging in, or changing the user's Naver account during the lookup.
- Place any citations, qualifications, or follow-up suggestions before this final block. End the response immediately after the block.

## Resource

Use `<skill-dir>/scripts/validate_note.py` to normalize and validate the one-line note before replying. Reuse it with `--max 25` to validate the nickname's character limit.
