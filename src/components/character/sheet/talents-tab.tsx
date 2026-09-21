import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { FeatsEditorDialog } from "./feats-editor-dialog";
import { TalentsEditorDialog } from "./talents-editor-dialog";
import type { CharacterWithRelations } from "./types";

export function TalentsTab({ character }: { character: CharacterWithRelations }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Feats</CardTitle>
          <CardAction>
            <FeatsEditorDialog characterId={character.id} feats={character.feats} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {character.feats.length === 0 ? (
            <p className="text-muted-foreground text-sm">None recorded.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {character.feats.map((f) => (
                <li key={f.id}>{f.name}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spheres</CardTitle>
        </CardHeader>
        <CardContent>
          {character.spheres.length === 0 ? (
            <p className="text-muted-foreground text-sm">None recorded.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {character.spheres.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Talents</CardTitle>
          <CardAction>
            <TalentsEditorDialog characterId={character.id} talents={character.talents} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {character.talents.length === 0 ? (
            <p className="text-muted-foreground text-sm">None recorded.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {character.talents.map((t) => (
                <li key={t.id} className="flex justify-between gap-2">
                  <span>{t.name}</span>
                  {t.sphereName && (
                    <span className="text-muted-foreground text-xs">
                      {t.sphereName}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
