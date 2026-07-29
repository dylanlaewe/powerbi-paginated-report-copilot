# External-source discovery

This directory separates externally authored compatibility evidence from personally authored controlled fixtures.

- Controlled fixtures are authored by Dylan and stored under their fixture `source/` directories.
- External compatibility candidates are upstream-authored reports that may be proposed for a later reviewed import.
- Imported external sources are stored only in an explicitly authorized `imported/` fixture with pinned identity, unchanged upstream bytes, attribution, and static validation.
- Gate 2D contains discovery metadata only.
- Gate 2E imports exactly one source: the Microsoft Invoice sample. It is statically validated but has not been opened or rendered in Report Builder for this corpus.
- Gate 2F imports exactly one additional source: the Microsoft Transcript sample. It is also statically validated only; Invoice remains unchanged.

The Microsoft Reporting Services assessment is in `microsoft-reporting-services/`.
