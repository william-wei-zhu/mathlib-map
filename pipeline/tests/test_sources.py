from mathlibmap.sources import SOURCES


def test_every_source_has_license_and_url():
    for key, src in SOURCES.items():
        assert src.license, key
        assert src.url.startswith("https://"), key
