const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// FR3: Categorized skill catalog used for both "Skills to Teach" and "Skills to Learn"
const SKILL_CATEGORIES = [
  'IT & Programming',
  'Graphic Design',
  'Music',
  'Cooking',
  'Languages',
  'Photography',
  'Marketing',
  'Writing',
  'Fitness',
  'Business'
];

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: SKILL_CATEGORIES }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      minlength: 6,
      required: function () {
        return this.authProvider === 'local';
      }
    },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },

    // FR2: Profile management
    bio: { type: String, default: '', maxlength: 500 },
    location: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },

    // FR3: Skill cataloging
    skillsToTeach: { type: [skillSchema], default: [] },
    skillsToLearn: { type: [skillSchema], default: [] },

    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true }
);

// FR1: Password encryption with BCrypt (skipped for Google-authenticated accounts, which have no password)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  if (!this.password) return Promise.resolve(false); // Google-only account, no local password
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    bio: this.bio,
    location: this.location,
    avatarUrl: this.avatarUrl,
    skillsToTeach: this.skillsToTeach,
    skillsToLearn: this.skillsToLearn,
    role: this.role,
    authProvider: this.authProvider,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.SKILL_CATEGORIES = SKILL_CATEGORIES;
