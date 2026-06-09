import {
  getCustomExercises, saveCustomExercise, deleteCustomExercise,
  getCustomMuscleGroups, saveCustomMuscleGroup, deleteCustomMuscleGroup,
} from "../../lib/db";

export default async function handler(req, res) {
  const { type } = req.query; // "exercises" or "muscles"

  if (req.method === "GET") {
    try {
      const exercises = await getCustomExercises();
      const muscles = await getCustomMuscleGroups();
      res.status(200).json({ exercises, muscles });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else if (req.method === "POST") {
    try {
      const { kind, data } = req.body;
      if (kind === "exercise") await saveCustomExercise(data);
      else if (kind === "muscle") await saveCustomMuscleGroup(data);
      else return res.status(400).json({ error: "kind must be exercise or muscle" });
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else if (req.method === "DELETE") {
    try {
      const { kind, id } = req.body;
      if (kind === "exercise") await deleteCustomExercise(id);
      else if (kind === "muscle") await deleteCustomMuscleGroup(id);
      else return res.status(400).json({ error: "kind must be exercise or muscle" });
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }

  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
