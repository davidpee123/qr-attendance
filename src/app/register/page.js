// ... existing imports
import { setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebaseConfig";
import { useRouter } from 'next/navigation';

export default function SignUp() {
  // ... existing state variables
  const [name, setName] = useState(''); // Add state for name

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      // ... existing auth creation
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user details to Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: 'lecturer', // or 'student'
        name: name, // Save the name here
        uid: user.uid,
      });

      // ... existing redirects or messages
    } catch (error) {
      // ...
    }
  };

  return (
    // ... add input field for name to your form
    <input
      type="text"
      placeholder="Enter your full name"
      value={name}
      onChange={(e) => setName(e.target.value)}
      required
    />
    // ...
  );
}
