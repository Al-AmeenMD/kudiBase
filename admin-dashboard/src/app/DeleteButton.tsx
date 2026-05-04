'use client';

export default function DeleteButton() {
  return (
    <button 
      type="submit" 
      className="btn btn-danger"
      onClick={(e) => {
        if (!window.confirm('Are you sure you want to completely delete this user? This cannot be undone.')) {
          e.preventDefault();
        }
      }}
    >
      Delete
    </button>
  );
}
