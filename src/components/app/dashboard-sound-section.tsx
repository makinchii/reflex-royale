import { Music2, Play, Search } from "lucide-react";
import { AudioSettingsToggle, SettingsRoundSlider } from "@/components/app/dashboard-controls";
import { formatAudioTrackDuration, type AudioCategoryFilter } from "@/components/app/dashboard-settings";
import { Badge } from "@/components/thegridcn/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";
import { Input } from "@/components/thegridcn/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/thegridcn/select";
import type { AudioMixMode, AudioTrack } from "@/lib/audio";

export function DashboardSoundSection({
  audioCategoryFilter,
  audioMixMode,
  audioSearch,
  customAudioTrackId,
  filteredAudioPlaylist,
  masterVolume,
  musicVolume,
  onAudioCategoryFilterChange,
  onAudioMixModeChange,
  onAudioSearchChange,
  onMasterVolumeChange,
  onMusicVolumeChange,
  onRoundAlertsToggle,
  onSelectAudioTrack,
  onSfxVolumeChange,
  onVictoryPulseToggle,
  roundAlertsEnabled,
  setSectionRef,
  sfxVolume,
  victoryPulseEnabled,
}: {
  audioCategoryFilter: AudioCategoryFilter;
  audioMixMode: AudioMixMode;
  audioSearch: string;
  customAudioTrackId: string;
  filteredAudioPlaylist: AudioTrack[];
  masterVolume: number;
  musicVolume: number;
  onAudioCategoryFilterChange: (category: AudioCategoryFilter) => void;
  onAudioMixModeChange: (mode: AudioMixMode) => void;
  onAudioSearchChange: (value: string) => void;
  onMasterVolumeChange: (value: number) => void;
  onMusicVolumeChange: (value: number) => void;
  onRoundAlertsToggle: () => void;
  onSelectAudioTrack: (trackId: string) => void;
  onSfxVolumeChange: (value: number) => void;
  onVictoryPulseToggle: () => void;
  roundAlertsEnabled: boolean;
  setSectionRef: (element: HTMLElement | null) => void;
  sfxVolume: number;
  victoryPulseEnabled: boolean;
}) {
  return (
    <section
      ref={setSectionRef}
      data-section-id="sound"
      className="dashboard-settings-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
    >
      <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Sound</div>
      <div className="dashboard-settings-grid grid gap-5">
        <div className="dashboard-settings-category">
          <div className="dashboard-settings-category__heading">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Sound</p>
              <p className="mt-1 text-sm text-muted-foreground">Control the music player and game audio mix.</p>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">Live audio</Badge>
          </div>

          <div className="dashboard-sound-grid grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
            <Card className="dashboard-panel-card dashboard-sound-player-card border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader className="dashboard-panel-card-header">
                <div>
                  <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Music Player</CardTitle>
                  <CardDescription>Shared grid soundtrack and waveform monitor.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="dashboard-panel-card-content dashboard-sound-player-content">
                <div className="dashboard-sound-player-slot" />
                <div className="dashboard-settings-control-group dashboard-audio-settings-group dashboard-audio-settings-group--player">
                  <SettingsRoundSlider label="Master Volume" value={masterVolume} onChange={onMasterVolumeChange} />
                  <SettingsRoundSlider label="SFX Volume" value={sfxVolume} onChange={onSfxVolumeChange} />
                  <SettingsRoundSlider label="Music Volume" value={musicVolume} onChange={onMusicVolumeChange} />

                  <div className="dashboard-settings-toggle-list">
                    <AudioSettingsToggle label="Round Alerts" enabled={roundAlertsEnabled} onToggle={onRoundAlertsToggle} />
                    <AudioSettingsToggle label="Victory Pulse" enabled={victoryPulseEnabled} onToggle={onVictoryPulseToggle} />
                  </div>

                  <div className="dashboard-audio-mix-field">
                    <span className="dashboard-settings-label">Mix</span>
                    <Select value={audioMixMode} onValueChange={(value) => onAudioMixModeChange(value as AudioMixMode)}>
                      <SelectTrigger className="dashboard-settings-select" aria-label="Audio mix mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="lobby">Lobby</SelectItem>
                        <SelectItem value="battle">Battle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-panel-card dashboard-audio-settings-card border-primary/25 bg-card/15 backdrop-blur-xl">
              <CardHeader className="dashboard-panel-card-header">
                <div>
                  <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Audio Catalog</CardTitle>
                  <CardDescription>Search the grid library and select a custom soundtrack.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="dashboard-panel-card-content dashboard-audio-settings-content">
                <div className="dashboard-audio-catalog" aria-label="Audio Catalog">
                  <div className="dashboard-audio-catalog__header">
                    <span>Audio Catalog</span>
                    <strong>{filteredAudioPlaylist.length} tracks</strong>
                  </div>
                  <div className="dashboard-audio-catalog-search">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    <Input value={audioSearch} onChange={(event) => onAudioSearchChange(event.currentTarget.value)} placeholder="Search songs or artists" aria-label="Search audio catalog" />
                  </div>
                  <div className="dashboard-audio-catalog-filters" role="group" aria-label="Filter music category">
                    {(["all", "lobby", "battle"] as AudioCategoryFilter[]).map((category) => (
                      <button key={category} type="button" className={audioCategoryFilter === category ? "is-active" : undefined} onClick={() => onAudioCategoryFilterChange(category)}>
                        {category === "all" ? "All" : category}
                      </button>
                    ))}
                  </div>
                  <div className="dashboard-audio-catalog-list" role="list">
                    {filteredAudioPlaylist.map((track) => {
                      const selected = customAudioTrackId === track.trackId && audioMixMode === "custom";
                      return (
                        <button key={track.trackId} type="button" className={`dashboard-audio-catalog-row ${selected ? "is-active" : ""}`} onClick={() => onSelectAudioTrack(track.trackId)} role="listitem">
                          <span className="dashboard-audio-catalog-row__thumb">
                            {track.thumbnailImage || track.coverImage ? <img src={track.thumbnailImage || track.coverImage} alt="" /> : <Music2 className="h-4 w-4" />}
                          </span>
                          <span className="dashboard-audio-catalog-row__meta">
                            <strong>{track.title}</strong>
                            <small>{track.artist}</small>
                          </span>
                          <Badge variant="outline" className="dashboard-audio-catalog-row__category">{track.category}</Badge>
                          <span className="dashboard-audio-catalog-row__action">
                            <span className="dashboard-audio-catalog-row__duration">{formatAudioTrackDuration(track.durationSeconds)}</span>
                            <span className="dashboard-audio-catalog-row__play"><Play className="h-3.5 w-3.5" /></span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
