"""共通configの統合後も既存のVite+とFSDの指示を保持する。"""

import hashlib
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]


class RepositoryIntegrationTests(unittest.TestCase):
    def test_existing_vite_guidance_is_preserved_verbatim(self):
        # Arrange: 共通config導入前のCLAUDE.md全文のハッシュ
        content = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        expected = "d70a41e1853d99c1ba086b12c70895f8ce4f363c030cbf8a2a116ef54b162b82"

        # Act
        original = content.split("<!-- BEGIN REPOSITORY GUIDANCE -->\n", 1)[1].split(
            "<!-- END REPOSITORY GUIDANCE -->", 1
        )[0]
        digest = hashlib.sha256(original.encode()).hexdigest()

        # Assert
        self.assertEqual(digest, expected)
        self.assertIn("vp run -r test", original)
        self.assertIn("vp run ready", original)
        self.assertIn("vp <name>", original)
        self.assertIn("vp run <name>", original)

    def test_fsd_document_is_unchanged_and_must_be_read_explicitly(self):
        # Arrange
        path = ROOT / ".claude/rules/fsd-architecture.md"
        agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        expected = "5e1d6714ff5a337e0ed9942475c5d63fe35e1d710db397dfd5de938e7bbb87f1"

        # Act
        digest = hashlib.sha256(path.read_bytes()).hexdigest()

        # Assert
        self.assertEqual(digest, expected)
        self.assertIn("apps/*/src/**/*", agents)
        self.assertIn("[既存のFSD規則](.claude/rules/fsd-architecture.md)を全文読み", agents)
        self.assertIn("Codexもこの文書を明示的に読む", agents)
        self.assertIn("変更またはレビューを始める前に", agents)
        self.assertIn("自動展開だけで\n読んだことにしない", agents)

    def test_review_restrictions_do_not_prevent_implementation_checks(self):
        # Arrange
        content = (ROOT / "AGENTS.md").read_text(encoding="utf-8")

        # Act
        role_guidance = content.split("## 実装担当とレビュー担当の境界\n", 1)[1].split("\n## ", 1)[0]

        # Assert
        self.assertIn("実装担当の通常作業へは適用しない", role_guidance)
        self.assertIn("実装担当はユーザーの承認範囲で編集と必要な検証を行い", role_guidance)
        self.assertIn("レビュー担当はテストを実行せず", role_guidance)
        self.assertIn("レビューに使う権限条件を、実装やテストのために緩めてはならない", role_guidance)

    def test_repository_links_resolve_inside_the_checkout(self):
        # Arrange
        agents = ROOT / "AGENTS.md"
        links = re.findall(r"\]\(([^)#]+)(?:#[^)]*)?\)", agents.read_text(encoding="utf-8"))
        local_links = [link for link in links if "://" not in link]

        # Act
        resolved = [(link, (agents.parent / link).resolve(strict=True)) for link in local_links]

        # Assert
        self.assertIn(".claude/rules/fsd-architecture.md", local_links)
        for link, path in resolved:
            with self.subTest(link=link):
                self.assertTrue(path.is_relative_to(ROOT))
                self.assertTrue(path.is_file())


if __name__ == "__main__":
    unittest.main()
