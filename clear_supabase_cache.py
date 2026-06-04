#!/usr/bin/env python3
"""
Script pour supprimer la clé Supabase du Local Storage du navigateur.

⚠️ À exécuter AVANT d'ouvrir le navigateur.
"""
import os
import json

# Chemin vers le Local Storage de Chrome (Windows)
chrome_local_storage = os.path.expanduser(
    "~\AppData\Local\Google\Chrome\User Data\Default\Local Storage\leveldb"
)

# Chemin vers le Local Storage de Edge (Windows)
edge_local_storage = os.path.expanduser(
    "~\AppData\Local\Microsoft\Edge\User Data\Default\Local Storage\leveldb"
)

def clear_supabase_key():
    """Supprime la clé Supabase du Local Storage."""
    supabase_key = "sb-abajwgyrbpdbvnaoaana-auth-token"
    
    # Fonction pour parcourir les fichiers .ldb (LevelDB)
    def search_and_delete(directory):
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith(".ldb"):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "rb") as f:
                            content = f.read().decode("utf-16", errors="ignore")
                        
                        if supabase_key in content:
                            print(f"🔍 Clé trouvée dans {file_path}")
                            # Remplacer la clé par une chaîne vide (simplifié)
                            new_content = content.replace(supabase_key, "")
                            with open(file_path, "wb") as f:
                                f.write(new_content.encode("utf-16"))
                            print(f"✅ Clé supprimée de {file_path}")
                    except Exception as e:
                        print(f"⚠️ Erreur avec {file_path}: {e}")
    
    # Nettoyer Chrome et Edge
    print("🔍 Nettoyage du cache Chrome...")
    search_and_delete(chrome_local_storage)
    
    print("🔍 Nettoyage du cache Edge...")
    search_and_delete(edge_local_storage)
    
    print("✅ Cache Supabase nettoyé. Redémarre ton navigateur.")

if __name__ == "__main__":
    clear_supabase_key()