"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/supabaseClient";

const FREE_GROUP_SIZES = [2, 3];
const PRO_GROUP_SIZES = [4, 5, 6];
const STORAGE_KEY = "buddy_matcher_names_v2";

const gradients = [
  "linear-gradient(135deg,#ff6b6b,#f06595)",
  "linear-gradient(135deg,#339af0,#22b8cf)",
  "linear-gradient(135deg,#51cf66,#94d82d)",
  "linear-gradient(135deg,#fcc419,#ff922b)",
  "linear-gradient(135deg,#845ef7,#5c7cfa)",
];

function getSessionId() {
  if (typeof window === "undefined") return "";

  let sessionId = window.localStorage.getItem("bm_session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.localStorage.setItem("bm_session_id", sessionId);
  }

  return sessionId;
}

function parseNames(raw) {
  return raw
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function dedupeNames(arr) {
  const seen = new Set();
  const result = [];

  for (const name of arr) {
    const lower = name.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(name);
    }
  }

  return result;
}

function shuffleArray(arr) {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function buildGroups(sourceNames, groupSize) {
  const working = [...sourceNames];
  const groups = [];

  while (working.length > 0) {
    let currentGroupSize = groupSize;

    if (working.length <= groupSize) {
      currentGroupSize = working.length;
    } else if (working.length - groupSize === 1) {
      currentGroupSize = groupSize + 1;
    }

    groups.push(working.splice(0, currentGroupSize));
  }

  return groups;
}

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function pairKey(left, right) {
  const pair = [normalizeName(left), normalizeName(right)].sort();
  return `${pair[0]}|||${pair[1]}`;
}

function buildGroupSizes(totalNames, groupSize) {
  let remaining = totalNames;
  const sizes = [];

  while (remaining > 0) {
    let current = groupSize;

    if (remaining <= groupSize) {
      current = remaining;
    } else if (remaining - groupSize === 1) {
      current = groupSize + 1;
    }

    sizes.push(current);
    remaining -= current;
  }

  return sizes;
}

function parseBlockedPairsText(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const seen = new Set();
  const pairs = [];

  for (const line of lines) {
    const parts = line.includes("|") ? line.split("|") : line.split(",");

    if (parts.length < 2) continue;

    const left = parts[0].trim();
    const right = parts[1].trim();

    if (!left || !right) continue;
    if (normalizeName(left) === normalizeName(right)) continue;

    const key = pairKey(left, right);
    if (seen.has(key)) continue;

    seen.add(key);
    pairs.push({ left, right });
  }

  return pairs;
}

function formatBlockedPairsText(pairs) {
  return pairs.map((pair) => `${pair.left} | ${pair.right}`).join("\n");
}

function canJoinGroup(name, group, blockedPairSet) {
  return group.every((member) => !blockedPairSet.has(pairKey(name, member)));
}

function tryBuildSmartGroups({
  names,
  selectedSize,
  leaderNames,
  blockedPairs,
}) {
  const targetSizes = buildGroupSizes(names.length, selectedSize);
  const blockedPairSet = new Set(
    blockedPairs.map((pair) => pairKey(pair.left, pair.right))
  );

  const leaderSet = new Set(leaderNames.map((name) => normalizeName(name)));

  const chosenLeaders = shuffleArray(
    names.filter((name) => leaderSet.has(normalizeName(name)))
  );

  const nonLeaders = shuffleArray(
    names.filter((name) => !leaderSet.has(normalizeName(name)))
  );

  const groups = targetSizes.map(() => []);

  const oneLeaderPerGroup = chosenLeaders.slice(0, groups.length);
  const extraLeaders = chosenLeaders.slice(groups.length);

  oneLeaderPerGroup.forEach((leader, index) => {
    groups[index].push(leader);
  });

  const remainingNames = shuffleArray([...extraLeaders, ...nonLeaders]);

  for (const name of remainingNames) {
    const validGroupIndexes = groups
      .map((group, index) => ({ group, index }))
      .filter(({ group, index }) => {
        if (group.length >= targetSizes[index]) return false;
        return canJoinGroup(name, group, blockedPairSet);
      })
      .map(({ index }) => index);

    if (!validGroupIndexes.length) {
      return null;
    }

    const smallestSize = Math.min(
      ...validGroupIndexes.map((index) => groups[index].length)
    );

    const bestIndexes = validGroupIndexes.filter(
      (index) => groups[index].length === smallestSize
    );

    const pickedIndex =
      bestIndexes[Math.floor(Math.random() * bestIndexes.length)];

    groups[pickedIndex].push(name);
  }

  return groups;
}

export default function BuddyMatcherTool({
  isPro = false,
  authReady = false,
  isLoggedIn = false,
}) {
  const [rawInput, setRawInput] = useState("");
  const [groupSize, setGroupSize] = useState(2);
  const [customSize, setCustomSize] = useState(7);
  const [useCustom, setUseCustom] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [results, setResults] = useState([]);
  const [showProModal, setShowProModal] = useState(false);
  const [lockedReason, setLockedReason] = useState("");
  const [avoidRepeats, setAvoidRepeats] = useState(false);

  const [savedLists, setSavedLists] = useState([]);
  const [selectedSavedList, setSelectedSavedList] = useState("");
  const [savedListsLoading, setSavedListsLoading] = useState(false);

  const [noticeModal, setNoticeModal] = useState({
    open: false,
    title: "",
    message: "",
  });

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    onConfirm: null,
  });

  const [saveListModalOpen, setSaveListModalOpen] = useState(false);
  const [saveListName, setSaveListName] = useState("");

  const [blockedPairs, setBlockedPairs] = useState([]);
  const [blockedPairsModalOpen, setBlockedPairsModalOpen] = useState(false);
  const [blockedPairsDraft, setBlockedPairsDraft] = useState("");

  const [leaderNames, setLeaderNames] = useState([]);
  const [leadersModalOpen, setLeadersModalOpen] = useState(false);
  const [leadersDraft, setLeadersDraft] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRawInput(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, rawInput);
  }, [rawInput]);

    useEffect(() => {
    async function trackPageView() {
      const sessionId = getSessionId();
      if (!sessionId) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("usage_events").insert({
        event_type: "page_view",
        session_id: sessionId,
        user_id: user?.id ?? null,
        metadata: {
          path: window.location.pathname,
        },
      });
    }

    void trackPageView();
  }, []);

  const currentNames = useMemo(() => {
    return dedupeNames(parseNames(rawInput));
  }, [rawInput]);

  function openProModal(reason) {
    setLockedReason(reason);
    setShowProModal(true);

    void (async () => {
      const sessionId = getSessionId();
      if (!sessionId) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("usage_events").insert({
        event_type: "pro_modal_opened",
        session_id: sessionId,
        user_id: user?.id ?? null,
        metadata: {
          reason,
        },
      });
    })();
  }

  function openNotice(title, message) {
    setNoticeModal({
      open: true,
      title,
      message,
    });
  }

  function closeNotice() {
    setNoticeModal({
      open: false,
      title: "",
      message: "",
    });
  }

  function openConfirm({ title, message, confirmLabel = "Confirm", onConfirm }) {
    setConfirmModal({
      open: true,
      title,
      message,
      confirmLabel,
      onConfirm,
    });
  }

  function closeConfirm() {
    setConfirmModal({
      open: false,
      title: "",
      message: "",
      confirmLabel: "Confirm",
      onConfirm: null,
    });
  }

  async function handleConfirmProceed() {
    if (typeof confirmModal.onConfirm === "function") {
      await confirmModal.onConfirm();
    }
    closeConfirm();
  }

  function requirePro(reason) {
    if (isPro) return true;
    openProModal(reason);
    return false;
  }

  async function refreshSavedLists() {
    if (!authReady) return;

    if (!isLoggedIn || !isPro) {
      setSavedLists([]);
      setSelectedSavedList("");
      return;
    }

    setSavedListsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSavedListsLoading(false);
      setSavedLists([]);
      setSelectedSavedList("");
      return;
    }

    const { data, error } = await supabase
      .from("saved_lists")
      .select("id, name, names")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    setSavedListsLoading(false);

    if (error) {
      console.error("Could not load saved lists:", error);
      openNotice("Could not load saved lists", "Please try again.");
      return;
    }

    const nextLists = data || [];
    setSavedLists(nextLists);

    setSelectedSavedList((prev) =>
      nextLists.some((list) => list.id === prev) ? prev : ""
    );
  }

  useEffect(() => {
    void refreshSavedLists();
  }, [authReady, isLoggedIn, isPro]);

  function getSelectedGroupSize() {
    if (useCustom) {
      return Math.max(2, Number(customSize) || 2);
    }

    return Number(groupSize);
  }

  function scrollToResults() {
    window.setTimeout(() => {
      document.getElementById("results-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

    function handleGroupSizeChange(e) {
    const value = e.target.value;

    if (value === "custom") {
      if (!requirePro("Custom group sizes are a Pro feature.")) return;
      setUseCustom(true);
      return;
    }

    const size = Number(value);

    if (size > 3 && !requirePro(`Groups of ${size} are a Pro feature.`)) return;

    setUseCustom(false);
    setGroupSize(size);
  }

    function handleAddNames() {
    const cleaned = dedupeNames(parseNames(rawInput));
    setRawInput(cleaned.join("\n"));
    setShowNames(true);
  }

  function handleDeleteOne() {
    if (!currentNames.length) {
      openNotice("No names yet", "There are no names to delete.");
      return;
    }

    const nameToDelete = window.prompt("Type the exact name you want to delete:");

    if (!nameToDelete) return;

    const updated = currentNames.filter(
      (name) => name.toLowerCase() !== nameToDelete.trim().toLowerCase()
    );

    if (updated.length === currentNames.length) {
      openNotice("Name not found", "That name was not found.");
      return;
    }

    setRawInput(updated.join("\n"));
    setResults([]);
  }

  function handleDeleteAll() {
    openConfirm({
      title: "Delete all names?",
      message: "This will remove all names currently in the tool.",
      confirmLabel: "Delete all",
      onConfirm: async () => {
        setRawInput("");
        setResults([]);
        setShowNames(false);
        window.localStorage.removeItem(STORAGE_KEY);
      },
    });
  }

  function handleGenerate() {
    const names = currentNames;

    if (names.length < 2) {
      openNotice("Add more names", "Please add at least two names first.");
      return;
    }

    const selectedSize = getSelectedGroupSize();

    if (useCustom && !isPro) {
      openProModal("Custom group sizes are a Pro feature.");
      return;
    }

    if (selectedSize > 3 && !isPro) {
      openProModal(`Groups of ${selectedSize} are a Pro feature.`);
      return;
    }

    const activeBlockedPairs = blockedPairs.filter(
      (pair) =>
        names.some((name) => normalizeName(name) === normalizeName(pair.left)) &&
        names.some((name) => normalizeName(name) === normalizeName(pair.right))
    );

    const activeLeaderNames = leaderNames.filter((leader) =>
      names.some((name) => normalizeName(name) === normalizeName(leader))
    );

    let finalGroups = null;

    if (!activeBlockedPairs.length && !activeLeaderNames.length) {
      finalGroups = buildGroups(shuffleArray(names), selectedSize);
    } else {
      for (let attempt = 0; attempt < 300; attempt += 1) {
        finalGroups = tryBuildSmartGroups({
          names: shuffleArray(names),
          selectedSize,
          leaderNames: activeLeaderNames,
          blockedPairs: activeBlockedPairs,
        });

        if (finalGroups) break;
      }

      if (!finalGroups) {
        openNotice(
          "Couldn’t satisfy all rules",
          "Try removing some blocked pairs, using fewer group leaders, or changing the group size."
        );
        return;
      }
    }

    setResults(finalGroups);
    scrollToResults();

    void (async () => {
      const sessionId = getSessionId();
      if (!sessionId) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("usage_events").insert({
        event_type: "generate_groups",
        session_id: sessionId,
        user_id: user?.id ?? null,
        metadata: {
          selected_size: selectedSize,
          used_custom_size: useCustom,
          avoid_repeats: avoidRepeats,
          total_names: names.length,
          total_groups: finalGroups.length,
          blocked_pairs_count: activeBlockedPairs.length,
          leader_count: activeLeaderNames.length,
        },
      });
    })();
  }

  function handleCopy() {
    if (!results.length) {
      openNotice("Nothing to copy", "Generate some groups first.");
      return;
    }

    const text = results
      .map((group, index) => `Group ${index + 1}: ${group.join(", ")}`)
      .join("\n");

    navigator.clipboard.writeText(text);
    openNotice("Copied", "Your groups have been copied.");
  }

  function handleDownload() {
    if (!results.length) {
      openNotice("Nothing to download", "Generate some groups first.");
      return;
    }

    if (!requirePro("CSV export is a Pro feature.")) return;

    const rows = [["Group", "Name"]];

    results.forEach((group, groupIndex) => {
      group.forEach((name) => {
        rows.push([`Group ${groupIndex + 1}`, name]);
      });
    });

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "buddy-matches.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    openNotice("Downloaded", "Your CSV file has been downloaded.");
  }

  async function handleShareTool() {
    const shareData = {
      title: "Buddy Matcher",
      text: "Create random pairs or groups from any list of names in seconds.",
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall back below
      }
    }

    await navigator.clipboard.writeText(window.location.origin);
    openNotice("Link copied", "The Buddy Matcher link has been copied.");
  }

  function handleSaveList() {
    if (!requirePro("Saved named lists are a Pro feature.")) return;

    const cleanedNames = dedupeNames(parseNames(rawInput));

    if (!cleanedNames.length) {
      openNotice("Nothing to save", "Add some names first.");
      return;
    }

        void (async () => {
      const sessionId = getSessionId();
      if (!sessionId) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("usage_events").insert({
        event_type: "save_list_clicked",
        session_id: sessionId,
        user_id: user?.id ?? null,
        metadata: {
          total_names: cleanedNames.length,
        },
      });
    })();

    setSaveListName("");
    setSaveListModalOpen(true);
  }

  async function confirmSaveList() {
    const listName = saveListName.trim();

    if (!listName) {
      openNotice("Name required", "Please enter a name for this saved list.");
      return;
    }

    const cleanedNames = dedupeNames(parseNames(rawInput));

    if (!cleanedNames.length) {
      openNotice("Nothing to save", "Add some names first.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveListModalOpen(false);
      openNotice("Please log in", "You need to log in before saving lists.");
      return;
    }

    const { data, error } = await supabase
      .from("saved_lists")
      .upsert(
        {
          user_id: user.id,
          name: listName,
          names: cleanedNames,
        },
        {
          onConflict: "user_id,name",
        }
      )
      .select("id, name, names")
      .single();

    if (error) {
      console.error("Could not save list:", error);
      openNotice("Could not save list", "Please try again.");
      return;
    }

    setSaveListModalOpen(false);
    await refreshSavedLists();
    setSelectedSavedList(data.id);
    openNotice("Saved", `"${listName}" has been saved.`);
  }

  function handleLoadList() {
    if (!requirePro("Saved named lists are a Pro feature.")) return;

    if (!selectedSavedList) {
      openNotice("Choose a list", "Choose a saved list first.");
      return;
    }

    const selectedList = savedLists.find((list) => list.id === selectedSavedList);

    if (!selectedList || !selectedList.names?.length) {
      openNotice("List missing", "That saved list is empty or missing.");
      return;
    }

    setRawInput(selectedList.names.join("\n"));
    setResults([]);
    setShowNames(true);
    openNotice("Loaded", `"${selectedList.name}" has been loaded.`);
  }

  function handleDeleteList() {
    if (!requirePro("Saved named lists are a Pro feature.")) return;

    if (!selectedSavedList) {
      openNotice("Choose a list", "Choose a saved list first.");
      return;
    }

    const selectedList = savedLists.find((list) => list.id === selectedSavedList);

    if (!selectedList) {
      openNotice("List missing", "That saved list could not be found.");
      return;
    }

    openConfirm({
      title: "Delete saved list?",
      message: `Delete "${selectedList.name}"?`,
      confirmLabel: "Delete list",
      onConfirm: async () => {
        const { error } = await supabase
          .from("saved_lists")
          .delete()
          .eq("id", selectedList.id);

        if (error) {
          console.error("Could not delete list:", error);
          openNotice("Could not delete list", "Please try again.");
          return;
        }

        setSelectedSavedList("");
        await refreshSavedLists();
      },
    });
  }

  function handlePrint() {
    if (!results.length) {
      openNotice("Nothing to print", "Generate some groups first.");
      return;
    }

    if (!requirePro("Print / presentation mode is a Pro feature.")) return;

    window.print();
  }

  function handleAvoidRepeatsChange(e) {
    if (!e.target.checked) {
      setAvoidRepeats(false);
      return;
    }

    if (!requirePro("No-repeat pairing history is a Pro feature.")) return;

    setAvoidRepeats(true);
    openNotice(
      "Coming next",
      "No-repeat pairing history will be wired up next."
    );
  }

    function handleRandomPick() {
    if (!currentNames.length) {
      openNotice("No names yet", "Add some names first.");
      return;
    }

    const picked = shuffleArray(currentNames)[0];
    openNotice("Random pick", picked);
  }

  function handleOpenBlockedPairsModal() {
    if (!requirePro("Don't group these two is a Pro feature.")) return;

    setBlockedPairsDraft(formatBlockedPairsText(blockedPairs));
    setBlockedPairsModalOpen(true);
  }

  function handleSaveBlockedPairs() {
    const parsed = parseBlockedPairsText(blockedPairsDraft);
    setBlockedPairs(parsed);
    setBlockedPairsModalOpen(false);

    openNotice(
      "Blocked pairs updated",
      parsed.length
        ? `${parsed.length} blocked pair${parsed.length === 1 ? "" : "s"} saved.`
        : "No blocked pairs saved."
    );
  }

  function handleOpenLeadersModal() {
    if (!requirePro("Group leaders is a Pro feature.")) return;

    setLeadersDraft(leaderNames.join("\n"));
    setLeadersModalOpen(true);
  }

  function handleSaveLeaders() {
    const parsed = dedupeNames(parseNames(leadersDraft));
    setLeaderNames(parsed);
    setLeadersModalOpen(false);

    openNotice(
      "Group leaders updated",
      parsed.length
        ? `${parsed.length} leader${parsed.length === 1 ? "" : "s"} saved.`
        : "No group leaders saved."
    );
  }

  const previewText = useMemo(() => {
    if (currentNames.length === 0) {
      return "Add some names to see group distribution.";
    }

    const size = getSelectedGroupSize();
    let remaining = currentNames.length;
    const groups = [];

    while (remaining > 0) {
      let current = size;

      if (remaining <= size) {
        current = remaining;
      } else if (remaining - size === 1) {
        current = size + 1;
      }

      groups.push(current);
      remaining -= current;
    }

    return `Total buddies: ${currentNames.length} → Group sizes: ${groups.join(", ")}`;
  }, [currentNames, groupSize, customSize, useCustom]);

  const selectedGroupValue = useCustom ? "custom" : String(groupSize);

  return (
    <>
      <div className="tool-shell">
        <div className="tool-header">
          <div>
            <h2>Buddy Matcher</h2>
            <p>Create random groups in seconds.</p>
          </div>

          <div className="tool-status">Saved locally in your browser</div>
        </div>

        <div className="tool-grid-two">
          <div className="tool-card">
            <label htmlFor="name-input" className="form-label">
              Names
            </label>

            <textarea
              id="name-input"
              className="form-control input-box"
              rows={9}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={"Paste one name per line\nAda\nJack\nTom\nSarah"}
            />

            <div className="helper-text">
              Tip: you can paste a whole column straight from Excel or Google Sheets.
            </div>

            <div className="form-row-two">
              <div>
                <label htmlFor="group-size" className="form-label">
                  Group size
                </label>

                <select
                  id="group-size"
                  className="form-select"
                  value={selectedGroupValue}
                  onChange={handleGroupSizeChange}
                >
                  <option value="2">2 - Pairs</option>
                  <option value="3">3 - Trios</option>
                  <option value="4">4 - Pro</option>
                  <option value="5">5 - Pro</option>
                  <option value="6">6 - Pro</option>
                  <option value="custom">Custom - Pro</option>
                </select>
              </div>

              <div>
                <label htmlFor="saved-lists" className="form-label">
                  Saved lists
                </label>

                <select
                  id="saved-lists"
                  className="form-select"
                  value={selectedSavedList}
                  onChange={(e) => setSelectedSavedList(e.target.value)}
                  disabled={!isPro || savedListsLoading}
                >
                  <option value="">
                    {savedListsLoading ? "Loading..." : "Choose a saved list"}
                  </option>

                  {savedLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {useCustom && (
              <div className="custom-size-wrap">
                <label htmlFor="custom-size" className="form-label">
                  Custom size
                </label>

                <input
                  id="custom-size"
                  type="number"
                  min="2"
                  max="20"
                  className="form-control"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                />
              </div>
            )}

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="avoid-repeats"
                checked={avoidRepeats}
                onChange={handleAvoidRepeatsChange}
              />
              <label className="form-check-label" htmlFor="avoid-repeats">
                Avoid repeating the last grouping where possible
              </label>
            </div>

                        <div className="preview-box">{previewText}</div>

            <div className="smart-feature-grid">
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={handleRandomPick}
              >
                Pick one randomly
              </button>

              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={handleOpenBlockedPairsModal}
              >
                Don’t group these two
              </button>

              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={handleOpenLeadersModal}
              >
                Group leaders
              </button>
            </div>

            {(blockedPairs.length > 0 || leaderNames.length > 0) && (
              <div className="smart-summary">
                {blockedPairs.length > 0 && (
                  <p className="small-note">
                    <strong>Blocked pairs:</strong>{" "}
                    {blockedPairs.map((pair) => `${pair.left} + ${pair.right}`).join(", ")}
                  </p>
                )}

                {leaderNames.length > 0 && (
                  <p className="small-note">
                    <strong>Group leaders:</strong> {leaderNames.join(", ")}
                  </p>
                )}
              </div>
            )}

            <div className="action-grid">
              <button id="add-button" className="btn btn-primary" type="button" onClick={handleAddNames}>
                Add names
              </button>

              <button
                id="buttonGenerator"
                className="btn btn-success"
                type="button"
                onClick={handleGenerate}
              >
                Generate groups
              </button>

              <button
                id="delete-button"
                className="btn btn-outline-danger"
                type="button"
                onClick={handleDeleteOne}
              >
                Delete one
              </button>

              <button
                id="show-names"
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowNames((prev) => !prev)}
              >
                {showNames ? "Hide names" : "Show names"}
              </button>

              <button
                id="reset"
                className="btn btn-outline-warning"
                type="button"
                onClick={() => setResults([])}
              >
                Clear results
              </button>

              <button
                id="delete-all"
                className="btn btn-danger"
                type="button"
                onClick={handleDeleteAll}
              >
                Delete all names
              </button>
            </div>

            <div className="action-grid compact">
              <button
                id="save-list"
                className="btn btn-outline-success"
                type="button"
                onClick={handleSaveList}
              >
                Save current list
              </button>

              <button
                id="load-list"
                className="btn btn-outline-dark"
                type="button"
                onClick={handleLoadList}
              >
                Load selected list
              </button>

              <button
                id="delete-list"
                className="btn btn-outline-dark"
                type="button"
                onClick={handleDeleteList}
              >
                Delete selected list
              </button>
            </div>
          </div>

          <div className="tool-card results-card" id="results-panel">
            <div className="results-top">
              <div>
                <h3 className="results-title">Results</h3>
                <p className="results-sub">Copy, download or share your groups.</p>
              </div>

              <div className="results-actions">
                <button
                  id="copy-results"
                  className="btn btn-outline-success btn-sm"
                  type="button"
                  onClick={handleCopy}
                >
                  Copy
                </button>

                <button
                  id="download-results"
                  className="btn btn-outline-success btn-sm"
                  type="button"
                  onClick={handleDownload}
                >
                  Download
                </button>

                <button
                  id="share-tool"
                  className="btn btn-outline-success btn-sm"
                  type="button"
                  onClick={handleShareTool}
                >
                  Share tool
                </button>

                <button
                  className="btn btn-outline-success btn-sm"
                  type="button"
                  onClick={handlePrint}
                >
                  Print
                </button>
              </div>
            </div>

            {showNames && currentNames.length > 0 && (
              <div id="names-list" className="names-list">
                {currentNames.map((name, index) => (
                  <div key={`${name}-${index}`} className="name-chip">
                    {name}
                  </div>
                ))}
              </div>
            )}

            {results.length === 0 ? (
              <div id="empty-state" className="empty-state">
                Your generated groups will appear here.
              </div>
            ) : (
              <div id="matches" className="matches-grid">
                {results.map((group, groupIndex) => (
                  <div key={`group-${groupIndex}`} className="group-card">
                    <div className="group-label">Group {groupIndex + 1}</div>

                    <div>
                      {group.map((name, nameIndex) => (
                        <span
                          key={`${name}-${nameIndex}`}
                          className="name-pill"
                          style={{
                            background:
                              gradients[(groupIndex + nameIndex) % gradients.length],
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {blockedPairsModalOpen && (
        <div className="pro-modal-backdrop">
          <div className="pro-modal">
            <div className="pro-modal-badge">Buddy Matcher Pro</div>
            <h3>Don’t group these two</h3>
            <p>
              Enter one pair per line using this format:
              <br />
              <strong>Ada | Jack</strong>
            </p>

            <textarea
              className="form-control input-box modal-textarea"
              value={blockedPairsDraft}
              onChange={(e) => setBlockedPairsDraft(e.target.value)}
              placeholder={"Ada | Jack\nTom | Sarah"}
            />

            <div className="pro-modal-actions">
              <button
                type="button"
                className="btn btn-success"
                onClick={handleSaveBlockedPairs}
              >
                Save blocked pairs
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setBlockedPairsModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {leadersModalOpen && (
        <div className="pro-modal-backdrop">
          <div className="pro-modal">
            <div className="pro-modal-badge">Buddy Matcher Pro</div>
            <h3>Group leaders</h3>
            <p>
              Enter one leader name per line. Buddy Matcher will try to spread them across groups.
            </p>

            <textarea
              className="form-control input-box modal-textarea"
              value={leadersDraft}
              onChange={(e) => setLeadersDraft(e.target.value)}
              placeholder={"Ada\nTom\nSarah"}
            />

            <div className="pro-modal-actions">
              <button
                type="button"
                className="btn btn-success"
                onClick={handleSaveLeaders}
              >
                Save leaders
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setLeadersModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {saveListModalOpen && (
        <div className="pro-modal-backdrop">
          <div className="pro-modal">
            <div className="pro-modal-badge">Buddy Matcher Pro</div>
            <h3>Save current list</h3>
            <p>Give this list a name so you can load it again later.</p>

            <input
              type="text"
              className="form-control"
              placeholder="Example: Year 6 Maths"
              value={saveListName}
              onChange={(e) => setSaveListName(e.target.value)}
            />

            <div className="pro-modal-actions">
              <button type="button" className="btn btn-success" onClick={confirmSaveList}>
                Save list
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setSaveListModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {noticeModal.open && (
        <div className="pro-modal-backdrop">
          <div className="pro-modal">
            <div className="pro-modal-badge">Buddy Matcher</div>
            <h3>{noticeModal.title}</h3>
            <p>{noticeModal.message}</p>

            <div className="pro-modal-actions">
              <button type="button" className="btn btn-success" onClick={closeNotice}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.open && (
        <div className="pro-modal-backdrop">
          <div className="pro-modal">
            <div className="pro-modal-badge">Buddy Matcher</div>
            <h3>{confirmModal.title}</h3>
            <p>{confirmModal.message}</p>

            <div className="pro-modal-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmProceed}
              >
                {confirmModal.confirmLabel}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeConfirm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showProModal && (
        <div className="pro-modal-backdrop">
          <div className="pro-modal">
            <div className="pro-modal-badge">Buddy Matcher Pro</div>

            <h3>Unlock Pro features</h3>
            <p>{lockedReason}</p>

            <ul className="pro-modal-list">
              <li>Groups of 4, 5, 6 and custom sizes</li>
              <li>Saved named lists</li>
              <li>No-repeat pairing history</li>
              <li>CSV export</li>
              <li>Print / presentation mode</li>
            </ul>

            <div className="pro-modal-actions">
              {isLoggedIn ? (
                <Link
                  href="/upgrade"
                  className="btn btn-success"
                  onClick={() => {
                    void (async () => {
                      const sessionId = getSessionId();
                      if (!sessionId) return;

                      const {
                        data: { user },
                      } = await supabase.auth.getUser();

                      await supabase.from("usage_events").insert({
                        event_type: "upgrade_clicked",
                        session_id: sessionId,
                        user_id: user?.id ?? null,
                        metadata: {
                          source: "pro_modal",
                          cta: "go_pro",
                          reason: lockedReason,
                        },
                      });
                    })();
                  }}
                >
                  Go Pro
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="btn btn-success"
                  onClick={() => {
                    void (async () => {
                      const sessionId = getSessionId();
                      if (!sessionId) return;

                      await supabase.from("usage_events").insert({
                        event_type: "upgrade_clicked",
                        session_id: sessionId,
                        user_id: null,
                        metadata: {
                          source: "pro_modal",
                          cta: "log_in_to_unlock_pro",
                          reason: lockedReason,
                        },
                      });
                    })();
                  }}
                >
                  Log in to unlock Pro
                </Link>
              )}

              {!isLoggedIn && (
                <Link href="/upgrade" className="btn btn-outline-secondary">
                  See Pro features
                </Link>
              )}

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowProModal(false)}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}